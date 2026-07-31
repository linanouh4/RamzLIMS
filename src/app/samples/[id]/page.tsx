"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SampleDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [sample, setSample] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSample();
  }, []);

  async function loadSample() {
    const { data, error } = await supabase
      .from("samples")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      alert(error.message);
      router.push("/samples");
      return;
    }

    setSample(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        Loading sample...
      </div>
    );
  }

  if (!sample) {
    return (
      <div className="p-8 text-center">
        Sample not found
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">

      <button
        onClick={() => router.back()}
        className="mb-6 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
      >
        ← Back
      </button>

      <div className="bg-white shadow-xl rounded-xl p-8">

        <h1 className="text-3xl font-bold mb-8">
          Sample Details
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Info title="Project Name" value={sample.project_name} />
          <Info title="Client Name" value={sample.client_name} />
          <Info title="Sample Type" value={sample.sample_type} />
          <Info title="Received Date" value={sample.received_date} />
          <Info title="Received By" value={sample.received_by} />
          <Info title="Status" value={sample.status} />
          <Info title="Sample ID" value={sample.id} />

        </div>

        <div className="mt-10 border-t pt-6">

          <h2 className="text-xl font-semibold mb-4">
            Notes
          </h2>

          <div className="bg-gray-100 rounded-lg p-4 min-h-[120px]">
            {sample.notes || "No notes available"}
          </div>

        </div>

      </div>

    </div>
  );
}

function Info({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-500">
        {title}
      </div>

      <div className="font-semibold text-lg mt-1">
        {value || "-"}
      </div>
    </div>
  );
}
