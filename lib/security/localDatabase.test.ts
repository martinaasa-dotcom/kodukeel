import { describe, expect, it } from "vitest";
import { databaseTarget } from "./localDatabase";

describe("databaseTarget", () => {
  it("calls every loopback address local", () => {
    for (const url of [
      "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
      "postgresql://ci:x@127.0.0.1:5432/ci",
      "postgres://u:p@localhost/db",
      "postgresql://u:p@LOCALHOST:5433/db",
      "postgresql://u:p@127.8.9.10/db",
      "postgresql://u:p@[::1]:5432/db",
    ]) {
      expect(databaseTarget(url).local, url).toBe(true);
    }
  });

  it("calls a Unix socket local, by an empty host or a path in host=", () => {
    expect(databaseTarget("postgresql:///kodukeel").local).toBe(true);
    expect(databaseTarget("postgresql://localhost/db?host=/var/run/postgresql").local).toBe(true);
  });

  /*
    libpq also accepts `postgresql://user@/db?host=/path`, which the URL parser
    refuses outright. That fails closed, as anything unreadable does: the run is
    refused and the opt-in is the way through. Said here rather than discovered.
  */
  it("fails closed on the socket form the URL parser cannot read", () => {
    expect(databaseTarget("postgresql://u@/db?host=/var/run/postgresql")).toEqual({
      local: false, host: "unparseable",
    });
  });

  it("refuses anything that is somewhere else", () => {
    for (const url of [
      "postgresql://postgres.abcd:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
      "postgresql://u:p@db.example.com/db",
      "postgresql://u:p@10.0.0.5/db",
      "postgresql://u:p@127.0.0.1.evil.example/db",
      "postgresql://u:p@localhost.evil.example/db",
      "postgresql://u@db.example.com/db?host=db.example.com",
    ]) {
      expect(databaseTarget(url).local, url).toBe(false);
    }
  });

  /*
    A guard in front of a destructive run fails closed: a string that does not
    parse, or is not Postgres at all, is not a database on this machine.
  */
  it("fails closed on anything it cannot read", () => {
    expect(databaseTarget("")).toEqual({ local: false, host: "unparseable" });
    expect(databaseTarget("not a url").local).toBe(false);
    expect(databaseTarget("mysql://u:p@127.0.0.1/db").local).toBe(false);
  });

  it("hands back the host and never the password", () => {
    const target = databaseTarget("postgresql://user:s3cret@db.example.com:5432/db");
    expect(target.host).toBe("db.example.com");
    expect(JSON.stringify(target)).not.toContain("s3cret");
  });
});
