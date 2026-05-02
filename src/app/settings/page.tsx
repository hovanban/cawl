import { PromptSettings } from "@/components/PromptSettings";
import { DeepLSettings } from "@/components/DeepLSettings";
import { SiteSettings } from "@/components/SiteSettings";
import { AnthropicSettings } from "@/components/AnthropicSettings";

export const metadata = { title: "Settings — Cawl" };

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Cấu hình AI, dịch thuật và các tùy chọn khác</p>
      </div>
      <AnthropicSettings />
      <SiteSettings />
      <DeepLSettings />
      <PromptSettings />
    </div>
  );
}
