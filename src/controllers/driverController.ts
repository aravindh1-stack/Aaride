import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { comparePassword } from '../utils/password';
import { ApiResponse, Driver, DriverDocument, DriverLedger } from '../types/database.types';

/**
 * POST /api/driver/login
 * Authenticate driver via phone OR email and password
 */
export async function driverLogin(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const { identifier, phone, email, password } = req.body;

    // Driver can pass `phone`, `email`, or a generic `identifier` (which can be either)
    const loginIdentifier = (identifier || phone || email || '').trim();

    if (!loginIdentifier || !password) {
      res.status(400).json({
        success: false,
        error: 'Phone/Email and password are required for login.',
      });
      return;
    }

    // Determine query: search by phone or email
    let query = supabase.from('drivers').select('*');

    if (loginIdentifier.includes('@')) {
      query = query.eq('email', loginIdentifier.toLowerCase());
    } else {
      query = query.eq('phone', loginIdentifier);
    }

    const { data: driver, error } = await query.maybeSingle();

    if (error) {
      res.status(500).json({
        success: false,
        error: `Database query error: ${error.message}`,
      });
      return;
    }

    if (!driver) {
      res.status(401).json({
        success: false,
        error: 'Invalid phone/email or account not found.',
      });
      return;
    }

    if (!driver.is_active) {
      res.status(403).json({
        success: false,
        error: 'Driver account is suspended or inactive. Please contact administration.',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, driver.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid password. Please check your credentials.',
      });
      return;
    }

    // Exclude password_hash from driver response
    const { password_hash, ...driverProfile } = driver;

    res.status(200).json({
      success: true,
      message: 'Driver authenticated successfully.',
      data: driverProfile,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Internal server error: ${err.message || 'Unknown error'}`,
    });
  }
}

/**
 * GET /api/driver/vault/:driverId
 * Fetch all documents and expiration details for a specific driver with status computation
 */
export async function getDriverVault(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      res.status(400).json({
        success: false,
        error: 'driverId parameter is required.',
      });
      return;
    }

    // Verify driver exists
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, full_name, vehicle_number, vehicle_model, license_number')
      .eq('id', driverId)
      .maybeSingle();

    if (driverError || !driver) {
      res.status(404).json({
        success: false,
        error: 'Driver not found.',
      });
      return;
    }

    // Fetch documents
    const { data: documents, error: docsError } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', driverId)
      .order('expiry_date', { ascending: true, nullsFirst: false });

    if (docsError) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch documents: ${docsError.message}`,
      });
      return;
    }

    // Compute document expiry alerts
    const today = new Date();
    const enrichedDocs = (documents || []).map((doc) => {
      let status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY' = 'NO_EXPIRY';
      let daysRemaining: number | null = null;

      if (doc.expiry_date) {
        const expiry = new Date(doc.expiry_date);
        const diffTime = expiry.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          status = 'EXPIRED';
        } else if (daysRemaining <= 30) {
          status = 'EXPIRING_SOON';
        } else {
          status = 'VALID';
        }
      }

      return {
        ...doc,
        status,
        days_remaining: daysRemaining,
      };
    });

    res.status(200).json({
      success: true,
      message: 'Driver vault fetched successfully.',
      data: {
        driver,
        vault_count: enrichedDocs.length,
        documents: enrichedDocs,
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
 * POST /api/driver/ledger
 * Insert a daily financial record into `driver_ledger`
 */
export async function addLedgerEntry(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const { driver_id, entry_date, income, expense, notes } = req.body;

    if (!driver_id) {
      res.status(400).json({
        success: false,
        error: 'driver_id is mandatory.',
      });
      return;
    }

    const parsedIncome = Number(income ?? 0);
    const parsedExpense = Number(expense ?? 0);

    if (isNaN(parsedIncome) || isNaN(parsedExpense) || parsedIncome < 0 || parsedExpense < 0) {
      res.status(400).json({
        success: false,
        error: 'Income and expense must be non-negative numeric values.',
      });
      return;
    }

    const targetDate = entry_date ? String(entry_date).trim() : new Date().toISOString().split('T')[0];

    // Insert record
    const { data: ledgerEntry, error } = await supabase
      .from('driver_ledger')
      .insert({
        driver_id,
        entry_date: targetDate,
        income: parsedIncome,
        expense: parsedExpense,
        notes: notes ? String(notes).trim() : null,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({
        success: false,
        error: `Failed to insert ledger entry: ${error.message}`,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Daily ledger entry saved successfully.',
      data: {
        ...ledgerEntry,
        net_profit: Number(ledgerEntry.income) - Number(ledgerEntry.expense),
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
 * GET /api/driver/ledger/:driverId
 * Fetch historical daily earnings, expenses, and net profit calculations
 */
export async function getDriverLedger(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const { driverId } = req.params;
    const { start_date, end_date } = req.query;

    if (!driverId) {
      res.status(400).json({
        success: false,
        error: 'driverId parameter is required.',
      });
      return;
    }

    let query = supabase
      .from('driver_ledger')
      .select('*')
      .eq('driver_id', driverId);

    if (start_date && typeof start_date === 'string') {
      query = query.gte('entry_date', start_date);
    }
    if (end_date && typeof end_date === 'string') {
      query = query.lte('entry_date', end_date);
    }

    const { data: entries, error } = await query.order('entry_date', { ascending: false });

    if (error) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch driver ledger: ${error.message}`,
      });
      return;
    }

    const ledgerList = entries || [];

    // Calculate aggregated metrics
    const totalIncome = ledgerList.reduce((sum, item) => sum + Number(item.income || 0), 0);
    const totalExpense = ledgerList.reduce((sum, item) => sum + Number(item.expense || 0), 0);
    const netProfit = totalIncome - totalExpense;

    const enrichedEntries = ledgerList.map((entry) => ({
      ...entry,
      net_profit: Number(entry.income || 0) - Number(entry.expense || 0),
    }));

    res.status(200).json({
      success: true,
      message: 'Driver ledger fetched successfully.',
      data: {
        summary: {
          total_income: Number(totalIncome.toFixed(2)),
          total_expense: Number(totalExpense.toFixed(2)),
          net_profit: Number(netProfit.toFixed(2)),
          total_days_logged: ledgerList.length,
        },
        records: enrichedEntries,
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
 * GET /api/driver/family/:driverId
 * Fetch family and welfare details for a driver
 */
export async function getDriverFamily(req: Request, res: Response<ApiResponse>): Promise<void> {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      res.status(400).json({
        success: false,
        error: 'driverId is required.',
      });
      return;
    }

    const { data: family, error } = await supabase
      .from('driver_family')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: true });

    if (error) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch family members: ${error.message}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Family details retrieved successfully.',
      data: family,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Internal server error: ${err.message || 'Unknown error'}`,
    });
  }
}
