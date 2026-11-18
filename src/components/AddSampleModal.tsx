"use client";

import { useUiText } from "@/lib/uiText";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";

type Props = {
  open: boolean;
  sample?: any;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddSampleModal({
  open,
  sample,
  onClose,
  onSaved,
}: Props) {
  const ui = useUiText();
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState("");

  const [sampleNumber, setSampleNumber] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [receivedCondition, setReceivedCondition] = useState("");
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  async function loadProjects() {
    setLoadingProjects(true);

    try {
      const currentUser = getSavedUser();

      if (!currentUser) {
        alert(ui("لم يتم التعرف على المستخدم الحالي."));
        setProjects([]);
        return;
      }

      let query = supabase
        .from("projects")
        .select("id, project_name, branch_id, client_id")
        .order("project_name", {
          ascending: true,
        });

      /*
       * مدير الفرع:
       * يشاهد مشاريع فرعه فقط.
       */
      if (currentUser.role === "branch_manager") {
        if (!currentUser.branch_id) {
          alert(ui("مدير الفرع غير مرتبط بأي فرع."));
          setProjects([]);
          return;
        }

        query = query.eq(
          "branch_id",
          Number(currentUser.branch_id)
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error(
          "LOAD PROJECTS FOR SAMPLE ERROR:",
          error
        );

        alert(
          error.message ||
            ui("تعذر تحميل المشاريع.")
        );

        setProjects([]);
        return;
      }

      setProjects(data || []);

      console.log(
        "SAMPLE PROJECT FILTER:",
        {
          role: currentUser.role,
          branch_id: currentUser.branch_id,
          projects_count: data?.length || 0,
        }
      );
    } catch (error: any) {
      console.error(
        "LOAD PROJECTS EXCEPTION:",
        error
      );

      alert(
        error?.message ||
          ui("حدث خطأ أثناء تحميل المشاريع.")
      );

      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }

  useEffect(() => {
    if (sample) {
      setProjectId(
        sample.project_id?.toString() || ""
      );

      setSampleNumber(
        sample.sample_number || ""
      );

      setSampleType(
        sample.sample_type || ""
      );

      setReceivedDate(
        sample.received_date || ""
      );

      setReceivedBy(
        sample.received_by || ""
      );

      setReceivedCondition(
        sample.received_condition || ""
      );

      setStatus(
        sample.status || "Pending"
      );

      setNotes(
        sample.notes || ""
      );
    } else {
      setProjectId("");
      setSampleNumber("");
      setSampleType("");
      setReceivedDate("");
      setReceivedBy("");
      setReceivedCondition("");
      setStatus("Pending");
      setNotes("");
    }
  }, [sample, open]);

  if (!open) return null;

  async function saveSample() {
    if (!projectId) {
      alert(ui("Please select a project"));
      return;
    }

    const currentUser = getSavedUser();

    if (!currentUser) {
      alert(
        ui("لم يتم التعرف على المستخدم الحالي.")
      );
      return;
    }

    /*
     * حماية إضافية في الواجهة:
     * مدير الفرع لا يستطيع اختيار مشروع خارج فرعه.
     */
    if (currentUser.role === "branch_manager") {
      const selectedProject = projects.find(
        (project) =>
          Number(project.id) ===
          Number(projectId)
      );

      if (!selectedProject) {
        alert(
          ui("لا يمكنك اختيار مشروع تابع لفرع آخر.")
        );
        return;
      }

      if (
        Number(selectedProject.branch_id) !==
        Number(currentUser.branch_id)
      ) {
        alert(
          ui("لا يمكنك إضافة عينة إلى مشروع تابع لفرع آخر.")
        );
        return;
      }
    }

    setLoading(true);

    const payload = {
      project_id: Number(projectId),
      client_id: projects.find(project => Number(project.id) === Number(projectId))?.client_id ?? null,
      sample_number: sampleNumber,
      sample_type: sampleType,
      received_date: receivedDate,
      received_by: receivedBy,
      received_condition: receivedCondition,
      status,
      notes,
    };

    let error;

    if (sample) {
      const response = await supabase
        .from("samples")
        .update(payload)
        .eq("id", sample.id).select("id").single();

      error = response.error;
    } else {
      const response = await supabase
        .from("samples")
        .insert([payload]);

      error = response.error;
    }

    setLoading(false);

    if (error) {
      console.error(
        "SAVE SAMPLE ERROR:",
        error
      );

      alert(error.message);
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[600px] p-8">

        <h2 className="text-2xl font-bold mb-6">
          {sample ? ui("Edit Sample") : ui("Add Sample")}
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <select
            className="border rounded-lg p-3 col-span-2"
            value={projectId}
            onChange={(e) =>
              setProjectId(e.target.value)
            }
            disabled={loadingProjects}
          >
            <option value="">
              {loadingProjects
                ? ui("Loading Projects...")
                : ui("Select Project")}
            </option>

            {projects.map((project) => (
              <option
                key={project.id}
                value={project.id}
              >
                {project.project_name}
              </option>
            ))}
          </select>

          <input
            className="border rounded-lg p-3"
            placeholder={ui("Sample Number")}
            value={sampleNumber}
            onChange={(e) =>
              setSampleNumber(e.target.value)
            }
          />

          <select className="border rounded-lg p-3" aria-label={ui("Sample Type")} value={sampleType} onChange={e => setSampleType(e.target.value)}>
            <option value="">{ui("Sample Type")}</option>
            {Array.from(new Set(["رمل", "خرسانة", "أسفلت", sampleType].filter(Boolean))).map(value => <option key={value} value={value}>{ui(value)}</option>)}
          </select>

          <input
            type="date"
            className="border rounded-lg p-3"
            value={receivedDate}
            onChange={(e) =>
              setReceivedDate(e.target.value)
            }
          />

          <input
            className="border rounded-lg p-3"
            placeholder={ui("Received By")}
            value={receivedBy}
            onChange={(e) =>
              setReceivedBy(e.target.value)
            }
          />

          <select className="border rounded-lg p-3" aria-label={ui("Received Condition")} value={receivedCondition} onChange={e => setReceivedCondition(e.target.value)}>
            <option value="">{ui("Received Condition")}</option>
            {Array.from(new Set(["جيدة", "مقبولة", "مرفوضة", receivedCondition].filter(Boolean))).map(value => <option key={value} value={value}>{ui(value)}</option>)}
          </select>

          <select
            className="border rounded-lg p-3"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
          >
            <option value="Pending">{ui("Pending")}</option>
            <option value="In Progress">{ui("In Progress")}</option>
            <option value="Completed">{ui("Completed")}</option>
            <option value="Approved">{ui("Approved")}</option>
          </select>

          <textarea
            className="border rounded-lg p-3 col-span-2"
            placeholder={ui("Notes")}
            rows={4}
            value={notes}
            onChange={(e) =>
              setNotes(e.target.value)
            }
          />

        </div>

        <div className="flex justify-end gap-3 mt-8">

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border"
          >
            {ui("Cancel")}
          </button>

          <button
            onClick={saveSample}
            disabled={
              loading ||
              loadingProjects ||
              projects.length === 0
            }
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg disabled:opacity-50"
          >
            {loading
              ? ui("Saving...")
              : ui("Save")}
          </button>

        </div>

      </div>
    </div>
  );
}