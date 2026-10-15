import * as XLSX from 'xlsx';
import { PlaybookPillar, SupportingVideoItem, VideoStatus } from '../types';

export interface ParsedContentPlan {
  playbook: PlaybookPillar[];
  supporting: SupportingVideoItem[];
}

export function inferPillarIdForVideo(
  pillarStage: string,
  dayNumber: number,
  playbook: PlaybookPillar[]
): string | undefined {
  if (!playbook || playbook.length === 0) return undefined;
  const stageLower = (pillarStage || '').toLowerCase();

  // 1. Check explicit Pillar # prefix (e.g. "Pillar #3" or "Pillar 3")
  const explicitNumMatch = stageLower.match(/pillar\s*#?(\d+)/i);
  if (explicitNumMatch) {
    const pIndex = parseInt(explicitNumMatch[1], 10) - 1;
    if (playbook[pIndex]) return playbook[pIndex].id;
  }

  // 2. Check exact match against `${p.stage} — ${p.pillar}` or `p.pillar`
  const directPillarMatch = playbook.find(
    p =>
      stageLower.includes(p.pillar.toLowerCase()) ||
      `${p.stage} — ${p.pillar}`.toLowerCase() === stageLower
  );
  if (directPillarMatch) return directPillarMatch.id;

  // 3. Extract parenthetical sub-topic hint, e.g. "1. Unaware Stage (Referrals)" -> "referrals"
  const parenMatch = stageLower.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const hint = parenMatch[1].trim().toLowerCase();
    const keywordMap: Record<string, string> = {
      content: 'pillar-1',
      referrals: 'pillar-2',
      'secret expert': 'pillar-3',
      leaks: 'pillar-4',
      'beige content': 'pillar-5',
      'broky magnets': 'pillar-6',
      'outsourced voice': 'pillar-7',
      '$5 ads': 'pillar-8',
      'conversation sales': 'pillar-9',
      'floor vs ceiling': 'pillar-10',
      'dxy model': 'pillar-11',
      'data vs opinion': 'pillar-12',
      '8-week cohort': 'pillar-13',
      'risk reversal': 'pillar-14',
      'super signature': 'pillar-15'
    };
    const mappedId = keywordMap[hint];
    if (mappedId) {
      const foundById = playbook.find(p => p.id === mappedId);
      if (foundById) return foundById.id;
    }

    // Match parenthetical words against pillar title or breaks/installs belief
    const hintWords = hint.split(/\s+/).filter(w => w.length >= 3);
    if (hintWords.length > 0) {
      const stageNum = stageLower.match(/^(\d+)\./)?.[1];
      const candidates = stageNum
        ? playbook.filter(p => p.stage.trim().startsWith(`${stageNum}.`))
        : playbook;
      const scored = candidates.find(p => {
        const hay = `${p.pillar} ${p.breaksBelief} ${p.installsBelief} ${p.mustHitBeats}`.toLowerCase();
        return hintWords.some(w => hay.includes(w));
      });
      if (scored) return scored.id;
    }
  }

  // 4. Match stage number prefix (1..5) and distribute across the 3 pillars in that stage
  const stageNumMatch = stageLower.match(/^(\d+)\./);
  if (stageNumMatch) {
    const stagePrefix = `${stageNumMatch[1]}.`;
    const stagePillars = playbook.filter(p => p.stage.trim().startsWith(stagePrefix));
    if (stagePillars.length > 0) {
      const subIdx = Math.floor(((dayNumber - 1) % 10) / 3) % stagePillars.length;
      return stagePillars[subIdx].id;
    }
  }

  // 5. Fallback: distribute evenly across playbook
  const fallbackIdx = Math.min(playbook.length - 1, Math.max(0, Math.floor((dayNumber - 1) / 3)));
  return playbook[fallbackIdx]?.id;
}

export function resolveMatchingPillar(
  video: SupportingVideoItem | undefined,
  playbook: PlaybookPillar[]
): PlaybookPillar | undefined {
  if (!playbook || playbook.length === 0) return undefined;
  if (!video) return playbook[0];

  if (video.pillarId) {
    const exact = playbook.find(p => p.id === video.pillarId);
    if (exact) return exact;
  }

  const inferredId = inferPillarIdForVideo(video.pillarStage, video.dayNumber || 1, playbook);
  if (inferredId) {
    const found = playbook.find(p => p.id === inferredId);
    if (found) return found;
  }

  return (
    playbook.find(
      p => p.stage.slice(0, 10).toLowerCase() === video.pillarStage.slice(0, 10).toLowerCase()
    ) || playbook[0]
  );
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

      const dayNum = supporting.length + 1;
      supporting.push({
        id: `daily-${dayNum}`,
        dayNumber: dayNum,
        pillarId: inferPillarIdForVideo(col0, dayNum, playbook),
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
