import PostTypeSelection from "@/components/dashboard/new-post/post-type-selection";
import { PageHeader } from "@/components/dashboard/shared/page-header/page-header";

export default function CreatePostPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="Create Post" />
      <div className="p-5 mt-13">
        <PostTypeSelection />
      </div>
    </div>
  );
}
