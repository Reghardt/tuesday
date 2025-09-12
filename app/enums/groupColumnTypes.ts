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

export const dateColumnTypeCodec = {
  encode: (value: string | null) => {
    return {
      value,
    };
  },
  decode: (content: JSONType) => {
    return z.object({ value: z.string().nullable() }).parse(content).value;
  },
};

export const statusColumnTypeCodec = {
  encode: (status_id: number | null) => {
    return {
      status_id,
    };
  },
  decode: (content: JSONType) => {
    return z.object({ status_id: z.number().nullable() }).parse(content)
      .status_id;
  },
};

export const priorityColumnTypeCodec = {
  encode: (priority_id: number | null) => {
    return {
      priority_id,
    };
  },
  decode: (content: JSONType) => {
    return z.object({ priority_id: z.number().nullable() }).parse(content)
      .priority_id;
  },
};

export const peopleColumnTypeCodec = {
  encode: (user_ids: string[]) => {
    return {
      user_ids,
    };
  },
  decode: (content: JSONType) => {
    return z.object({ user_ids: z.string().array() }).parse(content).user_ids;
  },
};
