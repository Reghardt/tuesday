import z from "zod";

export const ZEGroupColumnTypes = z.enum({
  text: 0,
  number_: 1,
  date: 2,
  time: 3,
  status: 4,
  priority: 5,
  people: 6,
  file: 7,
  timeline: 8,
  tags: 9,
  checkbox: 10,
  updates: 11,
});
