"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import BackButton from "@/components/BackButton";
import { supabase } from "@/lib/supabase";

const fields = ["Project / المشروع","Client / العميل","Consultant / الاستشاري","Location / الموقع","Report No. / رقم التقرير","Test date / تاريخ الفحص","Order No. / رقم الطلب","Sample code / رقم العينة","Material and layer / المادة والطبقة","License / الرخصة","Contract / العقد","Station / المحطة","Coordinates / الإحداثيات","District / الحي","Section / المقطع","Proctor reference / مرجع بروكتور","Proctor date / تاريخ بروكتور","MDD (g/cm³)","OMC (%)","Required compaction (%)","Notes / ملاحظات"] as const;
const columns = ["Location / الموقع","Soil °C","Depth cm","Water %","Wet g/cm³","Dry g/cm³"] as const;
const blank = () => Array.from({length:10}, () => columns.map(() => ""));

function Worksheet() {
  const id = Number(useParams().id);
  const [header,setHeader] = useState<Record<string,string>>({});
  const [rows,setRows] = useState<string[][]>(blank);
  const [editable,setEditable] = useState(false);
  const [loaded,setLoaded] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [version,setVersion] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      const task = await supabase.from("tasks").select("technician_id,completed_at,test_type").eq("id",id).single();
      if (task.error || task.data.test_type !== "electrical-density") throw Error("تعذّر فتح مهمة الفحص");
      const session = await supabase.auth.getUser();
      const actor = await supabase.from("users").select("id,role").eq("auth_user_id",session.data.user?.id).single();
      const sheet = await supabase.from("electrical_density_sheets").select("header,points,version").eq("task_id",id).maybeSingle();
      if (sheet.error) throw sheet.error;
      if (!active) return;
      setHeader(sheet.data?.header || {});
      setRows(sheet.data?.points || blank());
      setVersion(sheet.data?.version ?? null);
      setEditable(actor.data?.role === "technician" && actor.data.id === task.data.technician_id && !task.data.completed_at);
      setLoaded(true);
    }
    load().catch(error => { if(active) setMessage(error.message); });
    return () => { active = false; };
  },[id]);
  async function save() {
    setBusy(true);
    try {
      const data = {header, points:rows, task_id:id, version:(version ?? 0)+1};
      const query = version === null ? supabase.from("electrical_density_sheets").insert(data) :
        supabase.from("electrical_density_sheets").update(data).eq("task_id",id).eq("version",version);
      const result = await query.select("version").single();
      if(result.error) throw result.error;
      setVersion(result.data.version);
      setMessage("تم الحفظ / Saved");
    } catch { setMessage("تعذّر الحفظ. تحققي من حالة المهمة وآخر نسخة محفوظة."); }
    finally { setBusy(false); }
  }
  return <main className="p-6"><BackButton onClick={() => history.back()}/><h1 className="my-4 text-xl font-bold">الكثافة الحقلية بالجهاز الكهربائي / Electrical Density Gauge · ASTM D7830</h1>
    <p role="status">{message}</p>{loaded && <><fieldset disabled={!editable || busy}><div className="grid gap-3 sm:grid-cols-3">{fields.map(field => <label key={field}>{field}<input className="block w-full border p-2" value={header[field] || ""} onChange={e => setHeader({...header,[field]:e.target.value})}/></label>)}</div>
    <div className="my-5 overflow-x-auto"><table><thead><tr>{["#",...columns,"Compaction %","Result / النتيجة"].map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((row,i) => {
      const mdd=Number(header["MDD (g/cm³)"]), dry=Number(row[5]), required=Number(header["Required compaction (%)"]);
      const pct=mdd>0 && dry>0 ? 100*dry/mdd : null;
      return <tr key={i}><td>{i+1}</td>{row.map((value,j) => <td key={j}><input aria-label={columns[j]+" "+(i+1)} type={j ? "number":"text"} step="any" className="w-full min-w-20 border p-1" value={value} onChange={e=>setRows(rows.map((old,k)=>k===i ? old.map((v,l)=>l===j ? e.target.value:v):old))}/></td>)}<td>{pct?.toFixed(1)}</td><td>{pct!==null && required>0 ? (pct>=required?"مطابق / Pass":"غير مطابق / Fail"):""}</td></tr>;
    })}</tbody></table></div></fieldset>{editable && <button disabled={busy} onClick={save} className="rounded bg-blue-700 px-4 py-2 text-white">حفظ / Save</button>}</>}</main>;
}
export default function Page(){return <ProtectedRoute><Worksheet/></ProtectedRoute>;}
