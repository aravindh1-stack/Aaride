import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { generateTemporaryPassword, hashPassword } from '../utils/password';
import { ApiResponse, Driver, DriverDocument } from '../types/database.types';

/**
 * POST /api/admin/login
 * Authenticate admin by email
 */
export async function adminLogin(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        error: 'A valid email address is required.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query admin user from the `admins` table
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      res.status(500).json({
        success: false,
        error: `Database query error: ${error.message}`,
      });
      return;
    }

    if (!admin) {
      res.status(401).json({
        success: false,
        error: 'Admin not found. Please check your registered email or contact system supervisor.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Admin authenticated successfully.',
      data: admin,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Internal server error: ${err.message || 'Unknown error'}`,
    });
  }
}

/**
 * POST /api/admin/create-driver
 * Create a new driver profile with auto-generated temporary password
 */
export async function createDriver(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const {
      full_name,
      phone,
      email,
      vehicle_number,
      vehicle_model,
      license_number,
      custom_password,
    } = req.body;

    // Validate mandatory fields
    if (!full_name || !phone || !vehicle_number || !vehicle_model || !license_number) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: full_name, phone, vehicle_number, vehicle_model, and license_number are mandatory.',
      });
      return;
    }

    const cleanPhone = String(phone).trim();
    const cleanVehicleNumber = String(vehicle_number).trim().toUpperCase();
    const cleanLicenseNumber = String(license_number).trim().toUpperCase();
    const cleanEmail = email ? String(email).trim().toLowerCase() : null;

    // Generate or use custom temporary password
    const temporaryPassword = custom_password && typeof custom_password === 'string'
      ? custom_password.trim()
      : generateTemporaryPassword(8);

    const passwordHash = await hashPassword(temporaryPassword);

    // Insert driver record
    const { data: newDriver, error } = await supabase
      .from('drivers')
      .insert({
        full_name: full_name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        password_hash: passwordHash,
        vehicle_number: cleanVehicleNumber,
        vehicle_model: vehicle_model.trim(),
        license_number: cleanLicenseNumber,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation (duplicate phone or email)
      if (error.code === '23505') {
        res.status(409).json({
          success: false,
          error: 'A driver with this phone number or email address already exists.',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: `Failed to create driver: ${error.message}`,
      });
      return;
    }

    // Exclude password_hash from the returned response for security,
    // and provide temporary_password so the admin can issue it to the driver.
    const { password_hash, ...driverData } = newDriver;

    res.status(201).json({
      success: true,
      message: 'Driver profile created successfully.',
      data: {
        ...driverData,
        temporary_password: temporaryPassword,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Internal server error: ${err.message || 'Unknown error'}`,
    });
  }
}

/**
 * POST /api/admin/upload-doc
 * Handle mapping of document references (RC Book, License, Insurance, etc.)
 * linked to Supabase Storage file URLs with expiry dates.
 */
export async function uploadDocument(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const {
      driver_id,
      doc_type,
      doc_number,
      file_url,
      issue_date,
      expiry_date,
    } = req.body;

    // Validate mandatory fields
    if (!driver_id || !doc_type || !file_url) {
      res.status(400).json({
        success: false,
        error: 'driver_id, doc_type, and file_url are mandatory fields.',
      });
      return;
    }

    // Verify driver exists
    const { data: driver, error: driverCheckError } = await supabase
      .from('drivers')
      .select('id, full_name')
      .eq('id', driver_id)
      .maybeSingle();

    if (driverCheckError || !driver) {
      res.status(404).json({
        success: false,
        error: 'Target driver was not found.',
      });
      return;
    }

    // Insert document record into `driver_documents`
    const { data: document, error: docError } = await supabase
      .from('driver_documents')
      .insert({
        driver_id,
        doc_type: doc_type.trim(),
        doc_number: doc_number ? String(doc_number).trim() : null,
        file_url: file_url.trim(),
        issue_date: issue_date || null,
        expiry_date: expiry_date || null,
      })
      .select()
      .single();

    if (docError) {
      res.status(500).json({
        success: false,
        error: `Failed to link document: ${docError.message}`,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: `${doc_type} linked to driver vault successfully.`,
      data: document,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Internal server error: ${err.message || 'Unknown error'}`,
    });
  }
}

/**
 * GET /api/admin/drivers
 * Fetch all registered drivers and their status, including documents count & family summary
 */
export async function getDrivers(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select(`
        id,
        full_name,
        phone,
        email,
        vehicle_number,
        vehicle_model,
        license_number,
        is_active,
        created_at,
        driver_documents (
          id,
          doc_type,
          doc_number,
          expiry_date
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch drivers: ${error.message}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Drivers fetched successfully.',
      data: drivers,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Internal server error: ${err.message || 'Unknown error'}`,
    });
  }
}

/**
 * POST /api/admin/driver-family
 * Add a driver family member
 */
export async function addDriverFamily(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const { driver_id, member_name, relation, dob } = req.body;

    if (!driver_id || !member_name || !relation) {
      res.status(400).json({
        success: false,
        error: 'driver_id, member_name, and relation are required.',
      });
      return;
    }

    const { data: member, error } = await supabase
      .from('driver_family')
      .insert({
        driver_id,
        member_name: member_name.trim(),
        relation: relation.trim(),
        dob: dob || null,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({
        success: false,
        error: `Failed to add family member: ${error.message}`,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Family member recorded successfully.',
      data: member,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Internal server error: ${err.message || 'Unknown error'}`,
    });
  }
}
