return (
  <div className="p-8 max-w-5xl mx-auto bg-gray-100 min-h-screen">

    <div className="bg-white shadow-xl rounded-xl p-10">

      <div className="text-center border-b-2 border-gray-300 pb-6 mb-8">

        <h1 className="text-4xl font-bold tracking-wide">
          RAMZ EMIRATES LABORATORY
        </h1>

        <p className="text-lg text-gray-600 mt-2">
          Soil & Concrete Testing Laboratory
        </p>

        <h2 className="text-2xl font-bold mt-6">
          TEST REPORT
        </h2>

      </div>

      <div className="grid grid-cols-2 gap-6 mb-10">

        <div>
          <strong>Report Number</strong>
          <br />
          RPT-{sample.id}
        </div>

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

        <thead className="bg-gray-200">

          <tr>

            <th className="border p-3">Test</th>

            <th className="border p-3">Status</th>

            <th className="border p-3">Result</th>

            <th className="border p-3">Unit</th>

            <th className="border p-3">Notes</th>

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

      <div className="grid grid-cols-3 gap-10 mt-20 border-t pt-10">

        <div className="text-center">

          <div className="border-b border-black h-12"></div>

          <p className="mt-2 font-semibold">
            Tested By
          </p>

        </div>

        <div className="text-center">

          <div className="border-b border-black h-12"></div>

          <p className="mt-2 font-semibold">
            Reviewed By
          </p>

        </div>

        <div className="text-center">

          <div className="border-b border-black h-12"></div>

          <p className="mt-2 font-semibold">
            Approved By
          </p>

        </div>

      </div>

    </div>

  </div>
);
