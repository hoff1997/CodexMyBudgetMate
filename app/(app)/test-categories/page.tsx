import CategoryManager from "@/components/settings/category-manager";

export default function TestCategoriesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Category Manager Test Page</h1>
        <p className="text-muted-foreground">
          Test page for the Category Manager component. This component allows you to create, edit, delete, and reorder envelope categories.
        </p>
      </div>

      <CategoryManager />

      <div className="mt-8 p-4 bg-muted/30 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Test Features</h2>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>Create new categories with name, icon, and color</li>
          <li>Edit existing categories</li>
          <li>Delete categories (with confirmation)</li>
          <li>Drag and drop to reorder categories</li>
          <li>Categories persist in the database</li>
        </ul>
      </div>
    </div>
  );
}
