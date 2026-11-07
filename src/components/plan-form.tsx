import { useState } from "react";
import { service } from "../application";
import type { Plan } from "../domain/models";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { errorMessage } from "./forms";
import { useUI } from "../stores/ui";
export function PlanForm({ plan, close }: { plan: Plan; close: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useUI((s) => s.notify);
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && close()}
      title="Chỉnh sửa phương án"
      description="Điều chỉnh hướng đi khi bạn hiểu rõ vấn đề hơn."
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setBusy(true);
          try {
            await service.updatePlan(plan.id, {
              title: String(data.get("title")),
              description: String(data.get("description")),
            });
            notify("Đã cập nhật phương án");
            close();
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Tên phương án
          <input
            name="title"
            defaultValue={plan.title}
            required
            minLength={3}
            maxLength={160}
          />
        </label>
        <label>
          Cách thực hiện
          <textarea
            name="description"
            rows={4}
            defaultValue={plan.description}
            maxLength={10000}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button variant="outline" type="button" onClick={close}>
            Hủy
          </Button>
          <Button disabled={busy}>Lưu phương án</Button>
        </div>
      </form>
    </Dialog>
  );
}
