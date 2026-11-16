export const contractPrintFooter = `
<style>
  .contract-branch-footer { display: none; }

  @media print {
    @page { margin-bottom: 30mm; }

    .contract-branch-footer {
      display: block !important;
      position: fixed;
      bottom: -23mm;
      left: 0;
      right: 0;
      box-sizing: border-box;
      padding: 2mm 0 0;
      margin: 0;
      border-top: 1px solid #222;
      background: white;
      color: black;
      direction: rtl;
      text-align: right;
      font: normal 8.5pt/1.45 Tahoma, Arial, sans-serif;
    }

    .contract-branch-footer .branch-rows {
      display: grid;
      grid-template-columns: 1.05fr 1fr 1.15fr;
      gap: 1mm 3mm;
      align-items: baseline;
    }

    .contract-branch-footer .main-address { grid-column: span 2; }
    .contract-branch-footer bdi { white-space: nowrap; }
    .contract-branch-footer a { color: black; text-decoration: none; }
    .print-page:has(.contract-branch-footer) { overflow: visible !important; }
  }
</style>

<footer class="contract-branch-footer" dir="rtl">
  <div class="branch-rows">
    <div class="main-address">* المقر الرئيسي: مدينة القريات – مقابل البلدية القديمة – حي السديرية</div>
    <div>* الإدارة، ت: <bdi dir="ltr">0509982399 – 0509173884</bdi></div>

    <div>* الخبر والدمام، ت: <bdi dir="ltr">0554187910</bdi></div>
    <div>* مكة وجدة، ت: <bdi dir="ltr">0576120827</bdi></div>
    <div>* للتواصل: <a href="mailto:info@ramzalemarat.com"><bdi dir="ltr">info@ramzalemarat.com</bdi></a></div>

    <div>* سكاكا ودومة الجندل، ت: <bdi dir="ltr">0532720004</bdi></div>
    <div>* طريف وعرعر، ت: <bdi dir="ltr">0554596469</bdi></div>
    <div>* الموقع الإلكتروني: <a href="http://www.ramzalemarat.com"><bdi dir="ltr">www.ramzalemarat.com</bdi></a></div>
  </div>
</footer>`;