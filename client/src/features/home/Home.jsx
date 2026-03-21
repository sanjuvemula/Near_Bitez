import { restaurants } from "../../data/dummyData";
import RestaurantCard from "./RestaurantCard";

function Home() {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">
        Restaurants Near You 🍔
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {restaurants.map((item) => (
          <RestaurantCard key={item.id} data={item} />
        ))}
      </div>
    </div>
  );
}

export default Home;