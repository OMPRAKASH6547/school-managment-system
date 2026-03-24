export async function generateReportCardBuffer(data: any) {
    const React = await import("react");
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const ReportCard = (await import("../../app/components/ReportCard")).default;

    const element = React.createElement(ReportCard, data);

    const buffer = await renderToBuffer(element as React.ReactElement);
    return buffer;
}