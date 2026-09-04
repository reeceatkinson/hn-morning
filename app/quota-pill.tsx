type Props = {
  used: number;
  limit: number;
};

export function QuotaPill({ used, limit }: Props) {
  const remaining = Math.max(0, limit - used);
  const exhausted = remaining <= 0;
  return (
    <span className={exhausted ? "pill pill-exhausted" : "pill"}>
      {exhausted ? "Cap reached" : `${remaining} / ${limit} left`}
    </span>
  );
}
