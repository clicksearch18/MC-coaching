import { createClient } from '@supabase/supabase-js';
import { StudentProfile, WorkbookWeek, AppEmailAndAdminSettings, GroupDiscussionPost } from '../types';

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

export async function upsertSingleStudentToSupabase(student: StudentProfile): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = {
      id: student.id,
      name: student.name,
      company: student.company,
      profile: student,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('mc_students').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase upsertSingleStudent warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase upsertSingleStudent error:', err);
    return false;
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

export function subscribeToStudentsRealtime(
  onUpsert: (student: StudentProfile) => void,
  onDelete: (studentId: string) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('mc_students_realtime_sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mc_students' },
      payload => {
        if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as { id?: string })?.id;
          if (deletedId) onDelete(deletedId);
          return;
        }
        const row = payload.new as { id?: string; profile?: StudentProfile } | undefined;
        if (row?.profile && row.profile.id) {
          onUpsert(row.profile);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToSupabaseAuth(
  onAuthenticatedEmail: (email: string) => void
): () => void {
  if (!supabase) return () => {};

  supabase.auth.getSession().then(({ data }) => {
    const email = data.session?.user?.email;
    if (email) onAuthenticatedEmail(email.toLowerCase().trim());
  });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const email = session?.user?.email;
    if (email) onAuthenticatedEmail(email.toLowerCase().trim());
  });

  return () => {
    data.subscription.unsubscribe();
  };
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
      .gte('week_number', 1)
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

export async function upsertSingleLessonToSupabase(lesson: WorkbookWeek): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('mc_lessons').upsert(
      {
        week_number: lesson.weekNumber,
        lesson,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'week_number' }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function fetchAppSettingsFromSupabase(): Promise<AppEmailAndAdminSettings | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('mc_lessons')
      .select('lesson')
      .eq('week_number', 0)
      .maybeSingle();

    if (error || !data || !data.lesson) {
      return null;
    }
    const raw = data.lesson as Partial<AppEmailAndAdminSettings>;
    if (!raw.senderEmail || !Array.isArray(raw.templates)) {
      return null;
    }
    return raw as AppEmailAndAdminSettings;
  } catch {
    return null;
  }
}

export async function upsertAppSettingsToSupabase(settings: AppEmailAndAdminSettings): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('mc_lessons').upsert(
      {
        week_number: 0,
        lesson: settings,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'week_number' }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function sendSupabaseMagicLinkEmail(
  email: string,
  redirectPath = '/student'
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) {
    return { ok: false, error: 'Supabase is not configured.' };
  }
  try {
    const redirectTo = `${window.location.origin}${redirectPath}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo
      }
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to send magic link' };
  }
}

export async function fetchGroupDiscussionsFromSupabase(): Promise<GroupDiscussionPost[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('mc_lessons')
      .select('lesson')
      .eq('week_number', -1)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetchGroupDiscussions warning:', error.message);
      return null;
    }
    if (!data || !data.lesson) {
      return [];
    }
    const raw = data.lesson as { posts?: GroupDiscussionPost[] };
    if (Array.isArray(raw?.posts)) {
      return raw.posts;
    }
    return [];
  } catch {
    return null;
  }
}

export async function upsertGroupDiscussionsToSupabase(
  posts: GroupDiscussionPost[]
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('mc_lessons').upsert(
      {
        week_number: -1,
        lesson: { posts },
        updated_at: new Date().toISOString()
      },
      { onConflict: 'week_number' }
    );
    return !error;
  } catch {
    return false;
  }
}

export function subscribeToGroupDiscussionsRealtime(
  onUpdate: (posts: GroupDiscussionPost[]) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('mc_group_discussions_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mc_lessons', filter: 'week_number=eq.-1' },
      payload => {
        const row = payload.new as { lesson?: { posts?: GroupDiscussionPost[] } } | undefined;
        if (row?.lesson && Array.isArray(row.lesson.posts)) {
          onUpdate(row.lesson.posts);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

