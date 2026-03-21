function RestaurantCard({ data }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-xl font-bold">{data.name}</h3>
      <p>₹{data.price}</p>
    </div>
  );
}

export default RestaurantCard;