"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  open: boolean;
  sampleTestId: number;
  resultId?: number;
  initialData?: {
    result_value?: string;
    unit?: string;
    notes?: string;
    reference_value?: string;
    min_value?: string;
    max_value?: string;
  };
  onClose: () => void;
  onSaved: () => void;
};


export default function AddResultModal({
  open,
  sampleTestId,
  resultId,
  initialData,
  onClose,
  onSaved,
}: Props) {


  const [resultValue, setResultValue] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceValue, setReferenceValue] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);



  useEffect(() => {

    if (open && initialData) {

      setResultValue(
        initialData.result_value || ""
      );

      setUnit(
        initialData.unit || ""
      );

      setReferenceValue(
        initialData.reference_value || ""
      );

      setMinValue(
        initialData.min_value || ""
      );

      setMaxValue(
        initialData.max_value || ""
      );

      setNotes(
        initialData.notes || ""
      );

    }


    if (open && !initialData) {

      setResultValue("");
      setUnit("");
      setReferenceValue("");
      setMinValue("");
      setMaxValue("");
      setNotes("");

    }

  }, [open, initialData]);





  if (!open) return null;






  async function saveResult() {


    setLoading(true);



    let error;



    if (resultId) {


      const response = await supabase
        .from("test_results")
        .update({

          result_value: resultValue,
          unit: unit,
          reference_value: referenceValue,
          min_value: minValue,
          max_value: maxValue,
          notes: notes,

        })
        .eq("id", resultId);



      error = response.error;



    } else {


      const response = await supabase
        .from("test_results")
        .insert([

          {

            sample_test_id: sampleTestId,
            result_value: resultValue,
            unit: unit,
            reference_value: referenceValue,
            min_value: minValue,
            max_value: maxValue,
            notes: notes,

          }

        ]);



      error = response.error;


    }





    setLoading(false);




    if (error) {

      alert(error.message);

      return;

    }




    onSaved();

    onClose();


  }






  return (

    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">


      <div className="bg-white rounded-xl p-8 w-[500px]">


        <h2 className="text-2xl font-bold mb-5">

          {resultId ? "Edit Result" : "Add Result"}

        </h2>





        <input

          className="w-full border rounded p-3 mb-3"

          placeholder="Result Value"

          value={resultValue}

          onChange={(e) =>
            setResultValue(e.target.value)
          }

        />





        <input

          className="w-full border rounded p-3 mb-3"

          placeholder="Unit"

          value={unit}

          onChange={(e) =>
            setUnit(e.target.value)
          }

        />

        <div className="grid grid-cols-3 gap-3 mb-3">
          <input
            className="w-full border rounded p-3"
            placeholder="Reference"
            value={referenceValue}
            onChange={(e) => setReferenceValue(e.target.value)}
          />
          <input
            className="w-full border rounded p-3"
            placeholder="Min"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
          />
          <input
            className="w-full border rounded p-3"
            placeholder="Max"
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
          />
        </div>

        <textarea

          className="w-full border rounded p-3 mb-5"

          placeholder="Notes"

          value={notes}

          onChange={(e) =>
            setNotes(e.target.value)
          }

        />







        <div className="flex justify-end gap-3">


          <button

            onClick={onClose}

            className="px-5 py-2 border rounded"

          >

            Cancel

          </button>





          <button

            onClick={saveResult}

            disabled={loading}

            className="bg-blue-700 text-white px-5 py-2 rounded"

          >

            {loading ? "Saving..." : "Save"}

          </button>



        </div>



      </div>


    </div>

  );

}
