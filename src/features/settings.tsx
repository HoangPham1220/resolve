import { useState } from "react";
import { Download, Upload, HardDrive } from "lucide-react";
import { service } from "../application";
import { errorMessage } from "../components/forms";
import { Button } from "../components/ui/button";
import { useUI } from "../stores/ui";
export function Settings() {
  const [busy, setBusy] = useState(false);
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const notify = useUI((s) => s.notify);
  async function exportData() {
    setBusy(true);
    try {
      const blob = new Blob([await service.exportBackup()], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resolve-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Đã xuất bản sao lưu");
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Cài đặt</h1>
        </div>
      </div>
      <section className="panel settings-panel">
        <h2>Dữ liệu</h2>
        <p className="prose muted">
          Dữ liệu chỉ lưu trong trình duyệt này, chưa đồng bộ giữa các thiết bị.
          Hãy sao lưu trước khi xóa dữ liệu trình duyệt hoặc chuyển sang địa chỉ khác.
        </p>
        <div className="settings-row">
          <div>
            <h3>Xuất bản sao lưu</h3>
            <p className="muted">
              Tải toàn bộ dữ liệu dưới dạng JSON.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void exportData()}
          >
            <Download size={16} /> Xuất dữ liệu
          </Button>
        </div>
        <div className="settings-row">
          <div>
            <h3>Khôi phục từ bản sao lưu</h3>
            <p className="muted">
              Thêm dữ liệu từ tệp JSON. Không ghi đè dữ liệu trùng.
            </p>
          </div>
          <label
            className={`btn btn-outline file-button ${busy ? "disabled" : ""}`}
          >
            <Upload size={16} /> Nhập dữ liệu
            <input
              type="file"
              accept="application/json,.json"
              disabled={busy}
              aria-label="Nhập bản sao lưu JSON"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                try {
                  if (file.size > 20_000_000)
                    throw new Error("Tệp sao lưu vượt quá 20 MB.");
                  await service.importBackup(await file.text());
                  notify("Đã khôi phục dữ liệu thành công");
                } catch (error) {
                  notify(errorMessage(error));
                } finally {
                  setBusy(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>
        <div className="settings-row">
          <div>
            <h3>Lưu trữ bền vững</h3>
            <p className="muted">
              Hạn chế trình duyệt tự dọn dữ liệu khi thiếu bộ nhớ.
            </p>
            {persistent !== null && (
              <small>
                {persistent
                  ? "Đã bật lưu trữ bền vững."
                  : "Chưa được cấp quyền. Hãy giữ bản sao lưu."}
              </small>
            )}
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                setPersistent((await navigator.storage?.persist?.()) ?? false);
              } catch (e) {
                notify(errorMessage(e));
              }
            }}
          >
            <HardDrive size={16} /> Yêu cầu lưu trữ
          </Button>
        </div>
      </section>
    </>
  );
}
