import * as XLSX from 'xlsx';
import { PlaybookPillar, SupportingVideoItem, VideoStatus } from '../types';

export interface ParsedContentPlan {
  playbook: PlaybookPillar[];
  supporting: SupportingVideoItem[];
}

export async function parseStudentSpreadsheet(file: File): Promise<ParsedContentPlan> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const playbook: PlaybookPillar[] = [];
  const supporting: SupportingVideoItem[] = [];

  // 1. Parse Content Playbook sheet (if present)
  const playbookSheetName = workbook.SheetNames.find(
    n => n.toLowerCase().includes('playbook') || n.toLowerCase().includes('pillar')
  ) || workbook.SheetNames[0];

  if (playbookSheetName) {
    const sheet = workbook.Sheets[playbookSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });
    let currentStage = '1. UNAWARE STAGE';

    for (let r = 4; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      const col0 = row[0] ? String(row[0]).trim() : '';
      const col1 = row[1] ? String(row[1]).trim() : '';

      if (col0.startsWith('Generated ')) continue;

      if (col0 && !col1 && !row[2] && !row[3]) {
        currentStage = col0;
      } else if (col0 && col1 && col0 !== 'Pillar (Core Theme)' && col0 !== 'Pillar / Stage') {
        playbook.push({
          id: `pillar-${playbook.length + 1}`,
          stage: currentStage,
          pillar: col0,
          status: col1 || 'Not Started',
          breaksBelief: row[2] ? String(row[2]) : '',
          installsBelief: row[3] ? String(row[3]) : '',
          mustHitBeats: row[4] ? String(row[4]) : '',
          angles: {
            actionable: row[5] ? String(row[5]) : '',
            analytical: row[6] ? String(row[6]) : '',
            psychological: row[7] ? String(row[7]) : '',
            aspirational: row[8] ? String(row[8]) : ''
          }
        });
      }
    }
  }

  // 2. Parse Concussion Content sheet (50-item daily supporting videos)
  const supportingSheetName = workbook.SheetNames.find(
    n => n.toLowerCase().includes('supporting') || n.toLowerCase().includes('concussion') || n.toLowerCase().includes('daily')
  ) || workbook.SheetNames[1];

  if (supportingSheetName) {
    const sheet = workbook.Sheets[supportingSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });

    for (let r = 4; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length < 2) continue;
      const col0 = row[0] ? String(row[0]).trim() : '';
      const col1 = row[1] ? String(row[1]).trim() : '';

      if (!col0 || !col1 || col0 === 'Pillar / Stage' || col0.startsWith('Total Topics')) continue;

      const rawStatus = row[5] ? String(row[5]).trim() : 'Not Started';
      const status: VideoStatus =
        rawStatus === 'Completed' || rawStatus === 'In Progress' || rawStatus === 'Missed'
          ? rawStatus
          : 'Not Started';

      supporting.push({
        id: `daily-${supporting.length + 1}`,
        dayNumber: supporting.length + 1,
        pillarStage: col0,
        title: col1,
        hook1: row[2] ? String(row[2]) : '',
        hook2: row[3] ? String(row[3]) : '',
        hook3: row[4] ? String(row[4]) : '',
        selectedHook: 1,
        status
      });
    }
  }

  return { playbook, supporting };
}
