import {
  FieldInput,
  FieldTextarea,
  Panel,
  ToggleTile,
  VendorButton,
  LiveBadge,
} from "./VendorUi.jsx";

const VendorRestaurantTab = ({
  restaurant,
  restaurantForm,
  setRestaurantForm,
  setRestaurantDirty,
  restaurantImagePreview,
  handleRestaurantImageChange,
  saveRestaurant,
  savingRestaurant,
  updateRestaurantLiveState,
  updatingStoreStatus,
  hydrateRestaurantForm,
}) => {
  const handleInput = (key) => (e) => {
    setRestaurantDirty(true);
    setRestaurantForm((current) => ({ ...current, [key]: e.target.value }));
  };

  const handleCheck = (key) => (e) => {
    setRestaurantDirty(true);
    setRestaurantForm((current) => ({ ...current, [key]: e.target.checked }));
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr,450px]">
      <Panel tone="dark" className="p-8">
        <h2 className="mb-8 border-b border-[#eee7dc] pb-4 text-2xl font-black text-stone-950">
          Store Profile
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <FieldInput
            label="Store Name"
            value={restaurantForm.name}
            onChange={handleInput("name")}
            className="md:col-span-2"
          />
          <FieldInput
            label="Category"
            placeholder="Cafe, Diner"
            value={restaurantForm.category}
            onChange={handleInput("category")}
          />
          <FieldInput
            label="Cuisine Types"
            placeholder="Italian, Fast Food"
            value={restaurantForm.cuisineType}
            onChange={handleInput("cuisineType")}
          />
          <FieldInput
            label="Avg Delivery Time"
            type="number"
            value={restaurantForm.deliveryTime}
            onChange={handleInput("deliveryTime")}
            className="md:col-span-2"
          />
          <FieldInput
            label="Full Address"
            value={restaurantForm.address}
            onChange={handleInput("address")}
            className="md:col-span-2"
          />
          <FieldTextarea
            label="Description"
            value={restaurantForm.description}
            onChange={handleInput("description")}
            className="md:col-span-2"
          />

          <div className="space-y-3 md:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Cover Image
            </span>
            <label className="block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-orange-200 bg-[#fffaf5] transition-colors hover:bg-orange-50">
              <input
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={handleRestaurantImageChange}
              />
              {restaurantImagePreview ? (
                <img
                  src={restaurantImagePreview}
                  alt="Preview"
                  className="h-64 w-full object-cover"
                />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-orange-500">
                  <span className="mb-3 text-4xl">+</span>
                  <span className="text-sm font-black">Upload cover</span>
                </div>
              )}
            </label>
          </div>

          <div className="mt-2 space-y-4 md:col-span-2">
            <ToggleTile
              label="Pure Veg Store"
              detail="Show a veg-only badge"
              checked={restaurantForm.isVegOnly}
              accent="green"
              onChange={handleCheck("isVegOnly")}
            />
            <ToggleTile
              label="Accepting Orders"
              detail="Pause or resume online ordering"
              checked={restaurantForm.isActive}
              accent="orange"
              onChange={handleCheck("isActive")}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-4 border-t border-[#eee7dc] pt-8 md:col-span-2">
            <VendorButton
              tone="primary"
              className="flex-1"
              loading={savingRestaurant}
              onClick={saveRestaurant}
            >
              Save Profile
            </VendorButton>
            <VendorButton
              tone="secondary"
              className="flex-1"
              onClick={() => {
                hydrateRestaurantForm(restaurant);
                setRestaurantDirty(false);
              }}
            >
              Reset
            </VendorButton>
          </div>
        </div>
      </Panel>

      <div className="space-y-8">
        <Panel tone="urgent" className="sticky top-6 overflow-hidden p-0">
          <div className="h-60 bg-[linear-gradient(135deg,#fff7ed,#fed7aa_55%,#fdba74)]">
            {restaurantImagePreview ? (
              <img
                src={restaurantImagePreview}
                alt="Store preview"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="space-y-5 p-6">
            <div className="flex flex-wrap gap-2">
              <LiveBadge
                label={restaurantForm.isActive ? "Online" : "Offline"}
                accent={restaurantForm.isActive ? "green" : "red"}
              />
              {restaurantForm.isVegOnly ? (
                <LiveBadge label="Veg Only" accent="green" />
              ) : null}
            </div>

            <div>
              <h3 className="text-3xl font-black text-stone-950">
                {restaurantForm.name || "Store Name"}
              </h3>
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-orange-700">
                {restaurantForm.category || "Category"}
                {restaurantForm.cuisineType
                  ? ` | ${restaurantForm.cuisineType}`
                  : ""}
              </p>
              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-stone-600">
                {restaurantForm.description || "Store details will appear here."}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#eee7dc] bg-white p-4">
              <div className="w-full border-r border-[#eee7dc] text-center">
                <p className="mb-1 text-[10px] font-black text-stone-500">
                  DELIVERY
                </p>
                <p className="text-lg font-black text-stone-950">
                  {restaurantForm.deliveryTime || 30} min
                </p>
              </div>
              <div className="w-full text-center">
                <p className="mb-1 text-[10px] font-black text-stone-500">
                  STATUS
                </p>
                <p className="text-lg font-black text-stone-950">
                  {restaurantForm.isActive ? "Live" : "Paused"}
                </p>
              </div>
            </div>

            {restaurant?.isActive ? (
              <VendorButton
                tone="danger"
                className="w-full"
                loading={updatingStoreStatus}
                onClick={() => updateRestaurantLiveState(false)}
              >
                Pause Store
              </VendorButton>
            ) : (
              <VendorButton
                tone="success"
                className="w-full"
                loading={updatingStoreStatus}
                onClick={() => updateRestaurantLiveState(true)}
              >
                Go Live
              </VendorButton>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default VendorRestaurantTab;
