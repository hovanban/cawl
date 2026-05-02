import { ArticleList } from "@/components/ArticleList";

export const metadata = { title: "Bài viết — Cawl" };

export default function ArticlesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bài viết đã cào</h1>
          <p className="text-sm text-gray-500 mt-1">Toàn bộ nội dung đã được thu thập từ các job</p>
        </div>
      </div>
      <ArticleList />
    </div>
  );
}
