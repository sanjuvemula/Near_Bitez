const Skeleton = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-[20px] bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 bg-[length:200%_100%] ${className}`}
  />
);

export default Skeleton;
