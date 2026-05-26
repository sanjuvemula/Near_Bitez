import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { formatCurrency } from "../../../utils/formatters.js";
import {
  EmptyState,
  FieldInput,
  FieldTextarea,
  Panel,
  VendorButton,
} from "./VendorUi.jsx";

const PREDEFINED_CATEGORIES = [
  "Main Course - Curry",
  "Breads (Roti/Naan)",
  "Starters & Snacks",
  "Rice & Biryani",
  "Desserts & Sweets",
  "Beverages",
  "Combos & Thalis",
  "Fast Food",
];

const VendorMenuTab = ({
  restaurant,
  menuForm,
  setMenuForm,
  editingMenuId,
  menuImagePreview,
  handleMenuImageChange,
  saveMenuItem,
  savingMenu,
  resetMenuForm,
  filteredMenuItems,
  menuSearch,
  setMenuSearch,
  menuCategoryFilter,
  setMenuCategoryFilter,
  menuCategories,
  startEditingMenuItem,
  toggleAvailability,
  pendingAvailabilityId,
  deleteMenuItem,
  onTabChange,
}) => {
  const [formMode, setFormMode] = useState("none");
  const activeView = editingMenuId ? "dish" : formMode;

  if (!restaurant) {
    return (
      <EmptyState
        title="Store setup required"
        description="Complete your store profile before adding dishes."
        tone="info"
      />
    );
  }

  const handleCancel = () => {
    resetMenuForm();
    setFormMode("none");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr,460px]">
      <div className="space-y-5">
        <Panel tone="dark" className="flex flex-wrap gap-4 p-4">
          <div className="min-w-[200px] flex-1">
            <FieldInput
              placeholder="Search dishes..."
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
            />
          </div>

          <div className="w-full md:w-[220px]">
            <label className="block">
              <select
                value={menuCategoryFilter}
                onChange={(e) => setMenuCategoryFilter(e.target.value)}
                className="w-full rounded-xl border border-[#e7ddd0] bg-white px-4 py-3 text-sm font-semibold text-stone-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              >
                {menuCategories.map((category) => (
                  <option key={category} value={category}>
                    {category === "ALL" ? "All Categories" : category}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Panel>

        {filteredMenuItems.length === 0 ? (
          <EmptyState
            title="No dishes yet"
            description="Add your first dish or open tiffin plans."
            tone="positive"
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <AnimatePresence>
              {filteredMenuItems.map((item) => (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`group relative flex gap-4 rounded-[20px] border p-4 shadow-[0_22px_50px_-40px_rgba(15,23,42,0.32)] ${
                    item.isAvailable
                      ? "border-[#eee7dc] bg-white"
                      : "border-rose-200 bg-rose-50/70"
                  }`}
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#fffaf5]">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xl font-bold text-orange-300">
                        {item.name[0]}
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-base font-bold text-stone-950">
                          {item.name}
                        </h3>
                        <p className="shrink-0 text-lg font-bold text-orange-600">
                          {formatCurrency(item.price)}
                        </p>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            item.isVeg ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">
                          {item.category}
                        </span>
                        {!item.isAvailable ? (
                          <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                            Paused
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          startEditingMenuItem(item);
                          setFormMode("dish");
                        }}
                        className="flex-1 rounded-lg border border-[#e7ddd0] bg-white px-2 py-1.5 text-[11px] font-bold text-stone-600 transition hover:bg-orange-50 hover:text-orange-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleAvailability(item)}
                        disabled={pendingAvailabilityId === item._id}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${
                          item.isAvailable
                            ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }`}
                      >
                        {item.isAvailable ? "Pause" : "Live"}
                      </button>
                      <button
                        onClick={() => deleteMenuItem(item)}
                        className="flex-1 rounded-lg bg-rose-100 px-2 py-1.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Panel tone="dark" className="sticky top-6 h-fit overflow-hidden p-0">
        <AnimatePresence mode="wait">
          {activeView === "none" ? (
            <motion.div
              key="select-action"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 p-8"
            >
              <div>
                <h2 className="text-xl font-bold text-stone-950">
                  Add to your menu
                </h2>
                <p className="mt-1.5 text-sm text-stone-500">
                  Choose what you want to publish.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setFormMode("dish")}
                  className="w-full rounded-2xl border border-[#eee7dc] bg-white p-5 text-left transition hover:border-orange-200 hover:bg-orange-50"
                >
                  <h3 className="text-sm font-bold text-stone-950">
                    Add regular dish
                  </h3>
                  <p className="mt-1 text-[11px] text-stone-500">
                    Single items, combos, drinks.
                  </p>
                </button>

                <button
                  onClick={() => onTabChange("tiffin")}
                  className="w-full rounded-2xl border border-[#eee7dc] bg-white p-5 text-left transition hover:border-orange-200 hover:bg-orange-50"
                >
                  <h3 className="text-sm font-bold text-stone-950">
                    Open tiffin plans
                  </h3>
                  <p className="mt-1 text-[11px] text-stone-500">
                    Manage recurring meal plans.
                  </p>
                </button>
              </div>
            </motion.div>
          ) : null}

          {activeView === "dish" ? (
            <motion.div
              key="dish-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex max-h-[calc(100vh-100px)] flex-col"
            >
              <div className="flex items-center justify-between border-b border-[#eee7dc] bg-[#fffaf5] p-6">
                <h2 className="text-lg font-bold text-stone-950">
                  {editingMenuId ? "Edit dish" : "New dish"}
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-[10px] font-bold uppercase tracking-widest text-stone-500 transition hover:text-orange-700"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto p-6">
                <div className="space-y-2">
                  <label className="block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-orange-200 bg-[#fffaf5] transition hover:bg-orange-50">
                    <div className="relative h-40">
                      {menuImagePreview ? (
                        <img
                          src={menuImagePreview}
                          alt="Dish preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm font-black text-orange-600">
                          Upload dish image
                        </div>
                      )}
                      <input
                        type="file"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        accept="image/*"
                        onChange={handleMenuImageChange}
                      />
                    </div>
                  </label>
                </div>

                <div className="space-y-4">
                  <FieldInput
                    label="Dish Name"
                    placeholder="Kadai Paneer"
                    value={menuForm.name}
                    onChange={(e) =>
                      setMenuForm((current) => ({
                        ...current,
                        name: e.target.value,
                      }))
                    }
                  />

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
                      Category
                    </span>
                    <select
                      value={menuForm.category}
                      onChange={(e) =>
                        setMenuForm((current) => ({
                          ...current,
                          category: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[#e7ddd0] bg-white px-4 py-3 text-sm font-semibold text-stone-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="" disabled>
                        Select a category
                      </option>
                      {PREDEFINED_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <FieldInput
                      label="Price"
                      type="number"
                      placeholder="250"
                      value={menuForm.price}
                      onChange={(e) =>
                        setMenuForm((current) => ({
                          ...current,
                          price: e.target.value,
                        }))
                      }
                    />
                    <FieldInput
                      label="Offer Price"
                      type="number"
                      placeholder="220"
                      value={menuForm.discountPrice || ""}
                      onChange={(e) =>
                        setMenuForm((current) => ({
                          ...current,
                          discountPrice: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <FieldTextarea
                    label="Description"
                    placeholder="Taste, ingredients, preparation..."
                    value={menuForm.description}
                    onChange={(e) =>
                      setMenuForm((current) => ({
                        ...current,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-500">
                    Dietary Type
                  </label>
                  <div className="flex rounded-xl border border-[#e7ddd0] bg-[#fffaf5] p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setMenuForm((current) => ({ ...current, isVeg: true }))
                      }
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                        menuForm.isVeg
                          ? "bg-emerald-500 text-white"
                          : "text-stone-500"
                      }`}
                    >
                      Veg
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMenuForm((current) => ({ ...current, isVeg: false }))
                      }
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                        !menuForm.isVeg
                          ? "bg-rose-500 text-white"
                          : "text-stone-500"
                      }`}
                    >
                      Non-Veg
                    </button>
                  </div>
                </div>

                <label
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 ${
                    menuForm.isAvailable
                      ? "border-orange-200 bg-orange-50"
                      : "border-[#e7ddd0] bg-white"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-stone-950">
                      Live on storefront
                    </p>
                    <p className="mt-1 text-[10px] text-stone-500">
                      Customers can order this item now.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={menuForm.isAvailable}
                    onChange={(e) =>
                      setMenuForm((current) => ({
                        ...current,
                        isAvailable: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-orange-600"
                  />
                </label>
              </div>

              <div className="border-t border-[#eee7dc] bg-[#fffaf5] p-6">
                <VendorButton
                  tone="primary"
                  className="w-full"
                  loading={savingMenu}
                  onClick={saveMenuItem}
                >
                  {editingMenuId ? "Update Dish" : "Publish Dish"}
                </VendorButton>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Panel>
    </div>
  );
};

export default VendorMenuTab;
