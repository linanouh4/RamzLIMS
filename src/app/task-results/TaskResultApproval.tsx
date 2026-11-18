"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const stages = [
  { role: "technical_manager", label: "مراجعة المدير الفني" },
  { role: "quality_manager", label: "مراجعة مدير الجودة" },
  { role: "lab_manager", label: "اعتماد مدير المختبر" },
];

type Signoff = { stage: number; actor_name: string; approved_at: string; signature: string | null };

export default function TaskResultApproval({ taskId, role, userId }: { taskId: number; role: string; userId: number }) {
  const [rows, setRows] = useState<Signoff[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const result = await supabase.from("task_result_approvals")
      .select("stage,actor_name,approved_at,signature").eq("task_id", taskId).order("stage");
    if (result.error) {
      setRows(null);
      setError(result.error.message);
      return;
    }
    setRows(result.data);
  }

  useEffect(() => { void load(); }, [taskId]);

  const next = rows?.length ?? 0;
  const canSign = rows !== null && next < stages.length && (
    stages[next].role === role || (next === 2 && role === "admin" && userId === 1)
  );

  async function sign() {
    if (!canSign || busy) return;
    if (!window.confirm(`تأكيد ${stages[next].label} لهذه المهمة؟`)) return;
    setBusy(true);
    setError("");
    try {
      const result = await supabase.rpc("advance_task_result_approval", { p_task_id: taskId, p_stage: next + 1 });
      if (result.error) setError(result.error.message);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section dir="rtl" className="my-4 rounded border p-3" aria-label="اعتماد نتيجة المهمة">
      {rows === null && !error && <p>جارٍ تحميل المراجعات…</p>}
      {rows && <ol className="grid gap-3 sm:grid-cols-3">
        {stages.map((stage, index) => {
          const row = rows.find(item => item.stage === index + 1);
          return <li key={stage.role} className="rounded border p-3">
            <h3 className="font-semibold">{stage.label}</h3>
            {row ? <>
              {row.signature && /^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(row.signature)
                ? <img src={row.signature} alt={`توقيع ${row.actor_name}`} className="my-2 h-16 max-w-full object-contain" />
                : <p className="text-sm">لا توجد صورة توقيع مسجلة لهذه الخطوة</p>}
              <p>{row.actor_name}، {new Date(row.approved_at).toLocaleString("ar-SA")}</p>
            </> : <p>{index === next ? "بانتظار التوقيع" : "بانتظار الخطوة السابقة"}</p>}
          </li>;
        })}
      </ol>}
      {canSign && <button type="button" disabled={busy} onClick={sign} className="print:hidden mt-2 rounded bg-blue-700 px-3 py-2 text-white">توقيع · {stages[next].label}</button>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </section>
  );
}
