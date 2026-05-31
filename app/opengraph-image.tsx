import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#fafaf9",
          color: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ alignItems: "center", display: "flex", gap: "18px" }}>
            <div style={{ fontSize: "72px", fontWeight: 700, letterSpacing: "-1px" }}>
              Race Signals
            </div>
            <div style={{ display: "flex", gap: "6px", paddingTop: "14px" }}>
              <span style={{ background: "#b91c1c", height: "18px", width: "18px" }} />
              <span style={{ background: "#1d4ed8", height: "18px", width: "18px" }} />
              <span style={{ background: "#047857", height: "18px", width: "18px" }} />
            </div>
          </div>
          <div style={{ color: "#525252", fontSize: "30px", lineHeight: 1.35, maxWidth: "840px" }}>
            Source-linked FEC records for reporters covering 2026 House and Senate races.
          </div>
        </div>
        <div style={{ borderTop: "2px solid #d4d4d4", color: "#525252", fontSize: "24px", paddingTop: "24px" }}>
          FEC alert desk / filings / committees / outside spending
        </div>
      </div>
    ),
    size,
  );
}
