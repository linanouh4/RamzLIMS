
"use client";

import { useUiText } from "@/lib/uiText";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  test?: {
    id?: number;
    test_name?: string;
    branch_id?: number | null;
  } | null;
};

export default function AddTestModal({
  open,
  onClose,
  onSaved,
  test,
}: Props) {
  const ui = useUiText();
  const [testName, setTestName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTestName(test?.test_name || "");
    }
  }, [open, test]);

  if (!open) return null;

  async function saveTest() {
    const name = testName.trim();

    if (!name) {
      alert(ui("Please enter a test name"));
      return;
    }

    const currentUser = getSavedUser();

    if (!currentUser) {
      alert(
        ui("لم يتم التعرف على المستخدم الحالي.")
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * =========================
       * UPDATE EXISTING TEST
       * =========================
       */

      if (test?.id) {
        let query = supabase
          .from("tests")
          .update({
            test_name: name,
          })
          .eq("id", test.id);

        /*
         * مدير الفرع يستطيع تعديل
         * اختبار فرعه فقط.
         */

        if (
          currentUser.role ===
          "branch_manager"
        ) {
          if (!currentUser.branch_id) {
            alert(
              ui("مدير الفرع غير مرتبط بأي فرع.")
            );
            return;
          }

          query = query.eq(
            "branch_id",
            Number(currentUser.branch_id)
          );
        }

        const { error } = await query;

        if (error) {
          console.error(
            "UPDATE TEST ERROR:",
            error
          );

          alert(error.message);
          return;
        }

        onSaved();
        onClose();
        return;
      }

      /*
       * =========================
       * ADD NEW TEST
       * =========================
       */

      const newTest: any = {
        test_name: name,
      };

      /*
       * مدير الفرع:
       * الاختبار الجديد يتبع فرعه.
       *
       * Admin:
       * الاختبار يكون عامًا إذا لم نحدد فرعًا.
       */

      if (
        currentUser.role ===
        "branch_manager"
      ) {
        if (!currentUser.branch_id) {
          alert(
            ui("مدير الفرع غير مرتبط بأي فرع.")
          );
          return;
        }

        newTest.branch_id =
          Number(currentUser.branch_id);
      }

      const { error } = await supabase
        .from("tests")
        .insert([newTest]);

      if (error) {
        console.error(
          "ADD TEST ERROR:",
          error
        );

        alert(error.message);
        return;
      }

      onSaved();
      onClose();
    } catch (error: any) {
      console.error(
        "SAVE TEST EXCEPTION:",
        error
      );

      alert(
        error?.message ||
          ui("حدث خطأ أثناء حفظ الاختبار.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

      <div className="bg-white rounded-2xl shadow-2xl w-[500px] p-8">

        <h2 className="text-2xl font-bold mb-6">
          {test
            ? ui("Edit Test")
            : ui("Add New Test")}
        </h2>

        <input
          className="w-full border border-gray-300 rounded-lg p-3 text-black"
          placeholder={ui("Test name")}
          value={testName}
          onChange={(e) =>
            setTestName(e.target.value)
          }
        />

        <div className="flex justify-end gap-3 mt-8">

          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-gray-300 hover:bg-gray-400"
          >
            {ui("Cancel")}
          </button>

          <button
            onClick={saveTest}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {loading
              ? ui("Saving...")
              : test
              ? ui("Update Test")
              : ui("Save Test")}
          </button>

        </div>

      </div>

    </div>
  );
}

