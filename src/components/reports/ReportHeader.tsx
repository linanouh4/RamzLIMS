export default function ReportHeader() {
  return (
    <div className="border-2 border-black w-full mb-6">

      <div className="grid grid-cols-3">

        {/* Left */}
        <div className="border-r border-black">
          <table className="w-full text-sm border-collapse">
            <tbody>

              <tr>
                <td className="border-b border-black p-2 font-bold w-1/2">
                  Document Code
                </td>
                <td className="border-b border-black p-2 text-center">
                  QF 804/02/04
                </td>
              </tr>

              <tr>
                <td className="border-b border-black p-2 font-bold">
                  Issue Date
                </td>
                <td className="border-b border-black p-2 text-center">
                  20/08/2024
                </td>
              </tr>

              <tr>
                <td className="p-2 font-bold">
                  Revision Date
                </td>
                <td className="p-2 text-center">
                  31/12/2024
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Center */}
        <div className="flex flex-col items-center justify-center p-3 border-r border-black">

          <img
            src="/RAMZ ALEMARAT.png"
            alt="RAMZ ALEMARAT"
            className="h-16 object-contain mb-2"
          />

          <h2 className="font-bold text-lg">
            Technical Data Sheet
          </h2>

        </div>

        {/* Right */}
        <div>
          <table className="w-full text-sm border-collapse">
            <tbody>

              <tr>
                <td className="border-b border-black p-2 font-bold w-1/2">
                  Issue / Rev #
                </td>

                <td className="border-b border-black p-2 text-center">
                  1 / 1
                </td>
              </tr>

              <tr>
                <td className="border-b border-black p-2 font-bold">
                  Copy #
                </td>

                <td className="border-b border-black p-2"></td>
              </tr>

              <tr>
                <td className="p-2 font-bold">
                  Page
                </td>

                <td className="p-2 text-center">
                  Page 1 of 1
                </td>
              </tr>

            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}