"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReportHeader from "@/components/reports/ReportHeader";

export default function ConcreteTestPage() {
  const params = useParams();
  const taskId = Number(params.id);

  const [user, setUser] = useState<any>(null);
const [samples, setSamples] = useState([
  {
    sample_no: 1,
    slump: "",
    age_days: "",
    length: "",
    width: "",
    height: "",
    weight: "",
    load_kn: "",
  },
  {
    sample_no: 2,
    slump: "",
    age_days: "",
    length: "",
    width: "",
    height: "",
    weight: "",
    load_kn: "",
  },
  {
    sample_no: 3,
    slump: "",
    age_days: "",
    length: "",
    width: "",
    height: "",
    weight: "",
    load_kn: "",
  }
]);
  const [form, setForm] = useState({
    sample_code: "",
    sample_location: "",
    sampling_date: "",
    test_date: "",
    design_strength: "",
    cement_content: "",
    concrete_temperature: "",
    curing_temperature: "",
    specimen_type: "Cube",
    protection_capping: "",
    sampled_by: "",
    notes: "",
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);


  function updateField(
    field: string,
    value: string
  ) {
    setForm({
      ...form,
      [field]: value,
    });
  }
function updateSample(
  index:number,
  field:string,
  value:string
){

  const updated = [...samples];

  updated[index] = {
    ...updated[index],
    [field]: value
  };

  setSamples(updated);

}

  async function saveTest() {
    console.log("CURRENT USER:", user);
console.log("TASK ID:", taskId);
    
console.log({
  taskId,
  userId: user?.id,
  form
});
   const { data: testData, error: testError } = await supabase
  .from("concrete_tests")
  .insert({
    task_id: taskId,

    sample_code: form.sample_code,
    sample_location: form.sample_location,

    sampling_date: form.sampling_date || null,
test_date: form.test_date || null,

    design_strength: Number(form.design_strength),
    cement_content: Number(form.cement_content),

    concrete_temperature: Number(form.concrete_temperature),
    curing_temperature: Number(form.curing_temperature),

    specimen_type: form.specimen_type,

    protection_capping: form.protection_capping,

    sampled_by: form.sampled_by,

    tested_by: null,

    notes: form.notes,

    status: "Draft",
  })
  .select()
  .single();


if (testError) {
  alert(testError.message);
  return;
}


// حفظ نتائج العينات

const results = samples.map((sample)=>({

  test_id: testData.id,

  sample_no: sample.sample_no,

  slump: Number(sample.slump) || null,

  age_days: Number(sample.age_days) || null,

  length: Number(sample.length) || null,

  width: Number(sample.width) || null,

  height: Number(sample.height) || null,

  weight: Number(sample.weight) || null,

  load_kn: Number(sample.load_kn) || null,

}));


const { error: resultError } = await supabase
  .from("concrete_test_results")
  .insert(results);


if(resultError){

  alert(resultError.message);
  return;

}


alert("تم حفظ نموذج الفحص والعينات بنجاح");
  }


  return (

    <ProtectedRoute>

      <div className="p-6">
        <ReportHeader />

        <h1 className="text-2xl font-bold mb-6">
          🧪 نموذج فحص قوة الخرسانة
        </h1>


        <div className="grid md:grid-cols-2 gap-4">


          <input
            placeholder="كود العينة"
            className="border p-3 rounded"
            value={form.sample_code}
            onChange={(e)=>
              updateField(
                "sample_code",
                e.target.value
              )
            }
          />


          <input
            placeholder="موقع العينة"
            className="border p-3 rounded"
            value={form.sample_location}
            onChange={(e)=>
              updateField(
                "sample_location",
                e.target.value
              )
            }
          />


          <input
            type="date"
            className="border p-3 rounded"
            onChange={(e)=>
              updateField(
                "sampling_date",
                e.target.value
              )
            }
          />


          <input
            type="date"
            className="border p-3 rounded"
            onChange={(e)=>
              updateField(
                "test_date",
                e.target.value
              )
            }
          />


          <input
            placeholder="مقاومة التصميم Kg/cm2"
            className="border p-3 rounded"
            onChange={(e)=>
              updateField(
                "design_strength",
                e.target.value
              )
            }
          />


          <input
            placeholder="محتوى الاسمنت Kg/m3"
            className="border p-3 rounded"
            onChange={(e)=>
              updateField(
                "cement_content",
                e.target.value
              )
            }
          />


          <input
            placeholder="حرارة الخرسانة °C"
            className="border p-3 rounded"
            onChange={(e)=>
              updateField(
                "concrete_temperature",
                e.target.value
              )
            }
          />


          <input
            placeholder="حرارة المعالجة °C"
            className="border p-3 rounded"
            onChange={(e)=>
              updateField(
                "curing_temperature",
                e.target.value
              )
            }
          />


          <select
            className="border p-3 rounded"
            value={form.specimen_type}
            onChange={(e)=>
              updateField(
                "specimen_type",
                e.target.value
              )
            }
          >

            <option>
              Cube
            </option>

            <option>
              Cylinder
            </option>

            <option>
              Concrete Core
            </option>

          </select>


          <input
            placeholder="الحماية والتغطية"
            className="border p-3 rounded"
            onChange={(e)=>
              updateField(
                "protection_capping",
                e.target.value
              )
            }
          />


          <input
            placeholder="أخذ العينة بواسطة"
            className="border p-3 rounded"
            onChange={(e)=>
              updateField(
                "sampled_by",
                e.target.value
              )
            }
          />


          <textarea
            placeholder="ملاحظات"
            className="border p-3 rounded md:col-span-2"
            onChange={(e)=>
              updateField(
                "notes",
                e.target.value
              )
            }
          />


        </div>

<div className="mt-8">

  <h2 className="text-xl font-bold mb-4">
    📋 نتائج العينات
  </h2>

  <div className="overflow-x-auto">

    <table className="min-w-full border">

      <thead>
        <tr className="bg-gray-100">

          <th className="border p-2">رقم العينة</th>
          <th className="border p-2">Slump</th>
          <th className="border p-2">العمر يوم</th>
          <th className="border p-2">الطول</th>
          <th className="border p-2">العرض</th>
          <th className="border p-2">الارتفاع</th>
          <th className="border p-2">الوزن</th>
          <th className="border p-2">الحمل KN</th>

        </tr>
      </thead>


      <tbody>

        {[1,2,3].map((row)=>(

          <tr key={row}>

            <td className="border p-2 text-center">
              {row}
            </td>

            <td className="border p-2">
<input
  className="border w-20 p-1"
  value={samples[row-1].slump}
  onChange={(e)=>
    updateSample(
      row-1,
      "slump",
      e.target.value
    )
  }
/>            </td>

            <td className="border p-2">
          <input
  className="border w-20 p-1"
  value={samples[row-1].age_days}
  onChange={(e)=>
    updateSample(
      row-1,
      "age_days",
      e.target.value
    )
  }
/>
            </td>
<td className="border p-2">
  <input
    className="border w-20 p-1"
    value={samples[row - 1].length}
    onChange={(e) =>
      updateSample(row - 1, "length", e.target.value)
    }
  />
</td>

<td className="border p-2">
  <input
    className="border w-20 p-1"
    value={samples[row - 1].width}
    onChange={(e) =>
      updateSample(row - 1, "width", e.target.value)
    }
  />
</td>

<td className="border p-2">
  <input
    className="border w-20 p-1"
    value={samples[row - 1].height}
    onChange={(e) =>
      updateSample(row - 1, "height", e.target.value)
    }
  />
</td>

<td className="border p-2">
  <input
    className="border w-20 p-1"
    value={samples[row - 1].weight}
    onChange={(e) =>
      updateSample(row - 1, "weight", e.target.value)
    }
  />
</td>

<td className="border p-2">
  <input
    className="border w-20 p-1"
    value={samples[row - 1].load_kn}
    onChange={(e) =>
      updateSample(row - 1, "load_kn", e.target.value)
    }
  />
</td>
          </tr>

        ))}

      </tbody>

    </table>

  </div>

</div>
        <button

          onClick={saveTest}

          className="mt-6 bg-blue-700 text-white px-6 py-3 rounded-lg"

        >

          💾 حفظ النموذج
          <div className="flex gap-3 mt-6">
  

  <button
    onClick={() => window.print()}
    className="bg-green-700 text-white px-6 py-3 rounded-lg"
  >
    🖨 طباعة التقرير
  </button>
</div>

        </button>


      </div>


    </ProtectedRoute>

  );
}