/* ============================================================
   car-judge.ts  ―  車名 → カテゴリー判定プロンプトの組み立て・解析
   ------------------------------------------------------------
   SPEC.md「AI車種判定：既存 ask.js（Anthropic API）をそのまま流用」の通り、
   新しいAPIエンドポイントは作らず、carcare-reservation/reserve.js の
   CATEGORIZE_PROMPT / parseJudge と同一のロジックをTypeScriptに移植し、
   既存 ask.js を直接呼ぶ。size_guide/nickname_guide は menu API 経由で
   取得する（price-data.js が単一ソース。アプリ側にハードコードしない）。
============================================================ */

export function buildCategorizePrompt(sizeGuide: string, nicknameGuide: string): string {
  return `
あなたは洗車・コーティング店「カーケアセンター」の車種カテゴリー判定システムです。
お客様が入力した車名（通称・愛称・スペル揺れを含む）から、下の早見表と一般的な自動車知識を使って、
正式な車種名と、サイズ区分カテゴリー（C1〜C5）を判定してください。

【出力形式（厳守）】
- 必ず次のJSONだけを返す。前後に説明文・コードブロック記号（バッククォート）を一切付けない。
- {"category":"C1|C2|C3|C4|C5","official":"正式な車種名","confidence":"high|low","note":"一言コメント(任意)"}
- 判定できない場合は category を空文字 "" にし、note に確認したい内容を書く。
- C1=小型 〜 C5=大型。

==== 通称早見表（通称 → 正式な車種名） ====
${nicknameGuide}

==== サイズ区分表（C1=小さい 〜 C5=大きい） ====
${sizeGuide}
`.trim();
}

export interface JudgeResult {
  category?: string;
  official?: string;
  confidence?: "high" | "low";
  note?: string;
}

/* AIの返答からJSONを取り出す（前後にゴミが付いても拾えるように。reserve.jsのparseJudgeと同一） */
export function parseJudge(raw: string | null | undefined): JudgeResult | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JudgeResult;
  } catch {
    // noop
  }
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]) as JudgeResult;
    } catch {
      // noop
    }
  }
  return null;
}
