// Müşteri destek bilgisi: yönetim panelindeki şirket ayarlarından (/api/public/config) okunur.
let onbellek = null;
export async function destekBilgisi() {
  if (onbellek) return onbellek;
  try {
    const r = await fetch("/api/public/config", { credentials: "include" });
    const d = await r.json();
    const tel = String(d?.branding?.support_phone || d?.company?.phone || "").trim();
    const eposta = String(d?.branding?.support_email || d?.company?.email || "").trim();
    const rakam = tel.replace(/\D/g, "");
    const wa = rakam.length >= 10 ? (rakam.startsWith("0") ? "9" + rakam : rakam.length === 10 ? "90" + rakam : rakam) : "";
    onbellek = {
      tel,
      eposta,
      wa: wa ? "https://wa.me/" + wa + "?text=" + encodeURIComponent("Merhaba, Kuzey Menkul Değerler destek ekibiyle görüşmek istiyorum.") : "",
    };
  } catch {
    onbellek = { tel: "", eposta: "", wa: "" };
  }
  return onbellek;
}
