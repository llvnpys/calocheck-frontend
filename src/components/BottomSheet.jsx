import { useEffect, useRef } from "react";

export default function BottomSheet({ open, title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* dim */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .2s",
          zIndex: 40,
        }}
      />
      {/* sheet */}
      <div
        ref={ref}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          transform: open ? "translateY(0%)" : "translateY(100%)",
          transition: "transform .25s",
          background: "#fff",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: "0 -8px 24px rgba(0,0,0,.15)",
          zIndex: 41,
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #eee" }}>
          <div
            style={{
              width: 40,
              height: 4,
              background: "#ddd",
              borderRadius: 2,
              margin: "6px auto",
            }}
          />
          <div style={{ fontWeight: 700 }}>{title ?? "메뉴"}</div>
        </div>
        <div style={{ overflow: "auto" }}>{children}</div>
      </div>
    </>
  );
}
