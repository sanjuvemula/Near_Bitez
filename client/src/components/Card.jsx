import { createElement } from "react";

const Card = ({
  as = "div",
  className = "",
  interactive = false,
  children,
  ...props
}) =>
  createElement(
    as,
    {
      className: [
      "rounded-[20px] border border-[#eee7dc] bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.45)]",
      interactive
        ? "transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_24px_60px_-36px_rgba(234,88,12,0.55)]"
        : "",
      className,
    ].join(" "),
      ...props,
    },
    children
  );

export default Card;
