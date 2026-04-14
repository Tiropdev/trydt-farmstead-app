import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CowProfile, MilkRecord, FeedRecord, HealthRecord } from '@/types/farm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FarmDataContextType {
  cows: CowProfile[];
  milkRecords: MilkRecord[];
  feedRecords: FeedRecord[];
  healthRecords: HealthRecord[];
  loading: boolean;
  refreshData: () => Promise<void>;
  addCow: (cow: Omit<CowProfile, 'id'>) => Promise<void>;
  updateCow: (id: string, cow: Partial<CowProfile>) => Promise<void>;
  addMilkRecord: (record: Omit<MilkRecord, 'id'>) => Promise<void>;
  addFeedRecord: (record: Omit<FeedRecord, 'id'>) => Promise<void>;
  addHealthRecord: (record: Omit<HealthRecord, 'id'>) => Promise<void>;
}

const FarmDataContext = createContext<FarmDataContextType | undefined>(undefined);

export function FarmDataProvider({ children }: { children: ReactNode }) {
  const [cows, setCows] = useState<CowProfile[]>([]);
  const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([]);
  const [feedRecords, setFeedRecords] = useState<FeedRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [cowsData, milkData, feedData, healthData] = await Promise.all([
        supabase.from('cows').select('*').order('created_at', { ascending: false }),
        supabase.from('milk_records').select('*').order('date', { ascending: false }),
        supabase.from('feed_records').select('*').order('date', { ascending: false }),
        supabase.from('health_records').select('*').order('date', { ascending: false })
      ]);

      if (cowsData.data) {
        setCows(cowsData.data.map(cow => ({
          id: cow.id,
          name: cow.name,
          breed: cow.breed,
          dob: cow.dob,
          numberOfCalves: cow.number_of_calves,
          status: cow.status as 'active' | 'pregnant' | 'dry' | 'sick',
          remarks: cow.remarks || undefined
        })));
      }

      if (milkData.data) {
        setMilkRecords(milkData.data.map(record => ({
          id: record.id,
          cowId: record.cow_id,
          date: record.date,
          morningLitres: Number(record.morning_litres),
          noonLitres: Number(record.noon_litres),
          eveningLitres: Number(record.evening_litres),
          totalLitres: Number(record.total_litres),
          recordedBy: record.recorded_by || undefined
        })));
      }

      if (feedData.data) {
        setFeedRecords(feedData.data.map(record => ({
          id: record.id,
          cowId: record.cow_id,
          date: record.date,
          feedType: record.feed_type,
          quantity: Number(record.quantity),
          unit: record.unit as 'kg' | 'bags' | 'bundles'
        })));
      }

      if (healthData.data) {
        setHealthRecords(healthData.data.map(record => ({
          id: record.id,
          cowId: record.cow_id,
          date: record.date,
          vaccinationDate: record.vaccination_date || undefined,
          sprayDate: record.spray_date || undefined,
          dewormingDate: record.deworming_date || undefined,
          healthStatus: record.health_status as 'healthy' | 'sickness',
          attendedBy: record.attended_by || undefined,
          illness: record.illness || undefined
        })));
      }
    } catch (error) {
      console.error('Error fetching farm data:', error);
      toast.error('Failed to load farm data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addCow = async (cow: Omit<CowProfile, 'id'>) => {
    const { error } = await supabase.from('cows').insert({
      name: cow.name,
      breed: cow.breed,
      dob: cow.dob,
      number_of_calves: cow.numberOfCalves,
      status: cow.status,
      remarks: cow.remarks
    });

    if (error) {
      toast.error('Failed to add cow');
      throw error;
    } else {
      toast.success('Cow added successfully');
      await refreshData();
    }
  };

  const updateCow = async (id: string, cow: Partial<CowProfile>) => {
    const { error } = await supabase.from('cows').update({
      name: cow.name,
      breed: cow.breed,
      dob: cow.dob,
      number_of_calves: cow.numberOfCalves,
      status: cow.status,
      remarks: cow.remarks
    }).eq('id', id);

    if (error) {
      toast.error('Failed to update cow');
      throw error;
    } else {
      toast.success('Cow updated successfully');
      await refreshData();
    }
  };

  const addMilkRecord = async (record: Omit<MilkRecord, 'id'>) => {
    const { error } = await supabase.from('milk_records').insert({
      cow_id: record.cowId,
      date: record.date,
      morning_litres: record.morningLitres,
      noon_litres: record.noonLitres,
      evening_litres: record.eveningLitres,
      total_litres: record.totalLitres,
      recorded_by: record.recordedBy
    });

    if (error) {
      toast.error('Failed to add milk record');
      throw error;
    } else {
      toast.success('Milk record added');
      await refreshData();
    }
  };

  const addFeedRecord = async (record: Omit<FeedRecord, 'id'>) => {
    const { error } = await supabase.from('feed_records').insert({
      cow_id: record.cowId,
      date: record.date,
      feed_type: record.feedType,
      quantity: record.quantity,
      unit: record.unit
    });

    if (error) {
      toast.error('Failed to add feed record');
      throw error;
    } else {
      toast.success('Feed record added');
      await refreshData();
    }
  };

  const addHealthRecord = async (record: Omit<HealthRecord, 'id'>) => {
    const { error } = await supabase.from('health_records').insert({
      cow_id: record.cowId,
      date: record.date,
      vaccination_date: record.vaccinationDate,
      spray_date: record.sprayDate,
      deworming_date: record.dewormingDate,
      health_status: record.healthStatus,
      attended_by: record.attendedBy,
      illness: record.illness
    });

    if (error) {
      toast.error('Failed to add health record');
      throw error;
    } else {
      toast.success('Health record added');
      await refreshData();
    }
  };

  return (
    <FarmDataContext.Provider
      value={{
        cows,
        milkRecords,
        feedRecords,
        healthRecords,
        loading,
        refreshData,
        addCow,
        updateCow,
        addMilkRecord,
        addFeedRecord,
        addHealthRecord,
      }}
    >
      {children}
    </FarmDataContext.Provider>
  );
}

export function useFarmData() {
  const context = useContext(FarmDataContext);
  if (context === undefined) {
    throw new Error('useFarmData must be used within a FarmDataProvider');
  }
  return context;
}
