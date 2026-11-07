import { useState } from "react";
import { Download, Upload, ShieldCheck, HardDrive } from "lucide-react";
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
          <div className="eyebrow">DỮ LIỆU THUỘC VỀ BẠN</div>
          <h1>
            Cài đặt<span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            Một không gian cá nhân, ngay trên thiết bị của bạn.
          </p>
        </div>
      </div>
      <section className="panel settings-panel">
        <ShieldCheck size={30} className="green-text" />
        <h2>Dữ liệu riêng tư, lưu trên thiết bị</h2>
        <p className="prose muted">
          Resolve lưu dữ liệu trong IndexedDB của trình duyệt này. Dữ liệu được
          giữ sau khi tải lại trang; chưa đồng bộ giữa các thiết bị. Xóa dữ liệu
          trình duyệt hoặc đổi địa chỉ website sẽ làm bạn mất quyền truy cập bản
          lưu này. Hãy xuất bản sao lưu định kỳ.
        </p>
        <div className="settings-row">
          <div>
            <h3>Xuất bản sao lưu</h3>
            <p className="muted">
              Tất cả vấn đề, phương án, công việc và lịch sử dưới dạng JSON.
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
              Chỉ thêm dữ liệu mới. Từ chối tệp trùng ID, không ghi đè dữ liệu
              hiện có.
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
            <h3>Ưu tiên lưu trữ bền vững</h3>
            <p className="muted">
              Yêu cầu trình duyệt hạn chế tự dọn dữ liệu khi thiếu bộ nhớ.
            </p>
            {persistent !== null && (
              <small>
                {persistent
                  ? "Trình duyệt đã cấp lưu trữ bền vững."
                  : "Trình duyệt chưa cấp quyền. Hãy giữ bản sao lưu JSON."}
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
