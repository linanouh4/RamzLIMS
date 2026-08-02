"use client";



import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabase";



export default function ReportPage() {

  const params = useParams();

  const id = params.id as string;



  const [sample, setSample] = useState<any>(null);

  const [loading, setLoading] = useState(true);



  useEffect(() => {

    if (id) {

      loadReport();

    }

  }, [id]);



async function loadReport() {

  setLoading(true);



  // تحميل بيانات العينة

  const { data: sampleData, error: sampleError } = await supabase

    .from("samples")

    .select("*")

    .eq("id", id)

    .single();



  if (sampleError) {

    alert(sampleError.message);

    setLoading(false);

    return;

  }



  // تحميل الفحوصات

  const { data: sampleTests, error: testsError } = await supabase

    .from("sample_tests")

    .select("id, status, test_id")

    .eq("sample_id", id);



  if (testsError) {

    alert(testsError.message);

    setLoading(false);

    return;

  }



  const testsWithResults = await Promise.all(

    (sampleTests || []).map(async (item: any) => {

      const { data: test } = await supabase

        .from("tests")

        .select("test_name")

        .eq("id", item.test_id)

        .single();



      const { data: results } = await supabase

        .from("results")

        .select("*")

        .eq("sample_test_id", item.id);



      return {

        ...item,

        tests: test,

        results: results || [],

      };

    })

  );



  setSample({

    ...sampleData,

    sample_tests: testsWithResults,

  });



  setLoading(false);

}



  if (loading) {

    return (

      <div className="p-8 text-center">

        Loading Report...

      </div>

    );

  }



  if (!sample) {

    return (

      <div className="p-8 text-center">

        Report not found

      </div>

    );

  }



  return (

    <div className="p-8 max-w-5xl mx-auto">



      <div className="bg-white shadow rounded-xl p-8">



        <h1 className="text-3xl font-bold text-center mb-8">

          Test Report

        </h1>



        <div className="grid grid-cols-2 gap-6 mb-8">



          <div>

            <strong>Sample Number</strong>

            <br />

            {sample.sample_number}

          </div>



          <div>

            <strong>Sample Type</strong>

            <br />

            {sample.sample_type}

          </div>



          <div>

            <strong>Received Date</strong>

            <br />

            {sample.received_date}

          </div>



          <div>

            <strong>Status</strong>

            <br />

            {sample.status}

          </div>



        </div>



        <table className="w-full border border-gray-300">



          <thead className="bg-gray-100">



            <tr>



              <th className="border p-3 text-left">

                Test

              </th>



              <th className="border p-3 text-left">

                Status

              </th>



              <th className="border p-3 text-left">

                Result

              </th>



              <th className="border p-3 text-left">

                Unit

              </th>



              <th className="border p-3 text-left">

                Notes

              </th>



            </tr>



          </thead>



          <tbody>



            {sample.sample_tests?.map((test: any) => {



const result = test.results?.[0];



              return (



                <tr key={test.id}>



                  <td className="border p-3">

                    {test.tests?.test_name}

                  </td>



                  <td className="border p-3">

                    {test.status}

                  </td>



                  <td className="border p-3">

                    {result?.result_value || "-"}

                  </td>



                  <td className="border p-3">

                    {result?.unit || "-"}

                  </td>



                  <td className="border p-3">

                    {result?.notes || "-"}

                  </td>



                </tr>



              );



            })}



          </tbody>



        </table>



      </div>



    </div>

  );

}