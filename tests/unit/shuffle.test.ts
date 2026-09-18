import { describe, expect, it } from "vitest"

import { shuffled } from "@/lib/utils/shuffle"

describe("shuffled", () => {
  it("returns the same items in a new array, leaving the input alone", () => {
    const input = [1, 2, 3, 4, 5]
    const output = shuffled(input)

    expect(output).not.toBe(input)
    expect([...output].sort()).toEqual([1, 2, 3, 4, 5])
    expect(input).toEqual([1, 2, 3, 4, 5])
  })

  it("is deterministic for a given random source", () => {
    const alwaysZero = () => 0
    expect(shuffled(["a", "b", "c"], alwaysZero)).toEqual(["b", "c", "a"])
  })
})
