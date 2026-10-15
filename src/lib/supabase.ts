import { createClient } from '@supabase/supabase-js';
import { StudentProfile, WorkbookWeek } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

export async function fetchStudentsFromSupabase(): Promise<StudentProfile[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('mc_students')
      .select('id, profile, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchStudents warning:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => row.profile as StudentProfile);
  } catch (err) {
    console.warn('Supabase fetchStudents error:', err);
    return null;
  }
}

export async function upsertStudentsToSupabase(students: StudentProfile[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const rows = students.map(s => ({
      id: s.id,
      name: s.name,
      company: s.company,
      profile: s,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('mc_students').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase upsertStudents warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase upsertStudents error:', err);
    return false;
  }
}

export async function deleteStudentFromSupabase(studentId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('mc_students').delete().eq('id', studentId);
    return !error;
  } catch {
    return false;
  }
}

export async function fetchLessonsFromSupabase(): Promise<WorkbookWeek[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('mc_lessons')
      .select('week_number, lesson')
      .order('week_number', { ascending: true });

    if (error) {
      console.warn('Supabase fetchLessons warning:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => row.lesson as WorkbookWeek);
  } catch (err) {
    console.warn('Supabase fetchLessons error:', err);
    return null;
  }
}

export async function upsertLessonsToSupabase(lessons: WorkbookWeek[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const rows = lessons.map(l => ({
      week_number: l.weekNumber,
      lesson: l,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('mc_lessons')
      .upsert(rows, { onConflict: 'week_number' });
    return !error;
  } catch {
    return false;
  }
}
