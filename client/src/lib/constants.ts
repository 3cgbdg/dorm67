export const UNIVERSITIES = [
  {
    id: "lviv-polytechnic",
    name: "Lviv Polytechnic National University",
    domain: "lpnu.ua",
  },
];

/** Radix Select items cannot use `value=""`; use this for “no dorm chosen yet”. */
export const DORM_SELECT_PLACEHOLDER = "__dorm_unset__";

export const DORMS: Record<string, string[]> = {
  "lviv-polytechnic": [
    "Dormitory 1",
    "Dormitory 2",
    "Dormitory 3",
    "Dormitory 4",
  ],
};
