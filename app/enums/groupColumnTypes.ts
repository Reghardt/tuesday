import type { JSONType } from "node_modules/zod/v4/core/util.cjs";
import z from "zod/v4";

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

export const textColumnTypeCodec = {
  encode: (value: string) => {
    return {
      value,
    };
  },
  decode: (content: JSONType) => {
    return z.object({ value: z.string() }).parse(content).value;
  },
};

export const numberColumnTypeCodec = {
  encode: (value: number) => {
    return {
      value,
    };
  },
  decode: (content: JSONType) => {
    return z.object({ value: z.number() }).parse(content).value;
  },
};
