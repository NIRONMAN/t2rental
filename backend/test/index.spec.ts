import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("t2rental worker", () => {
	it("responds with service health (unit style)", async () => {
		const request = new IncomingRequest("http://example.com");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			service: "t2rental-backend",
			status: "ok",
		});
	});

	it("responds with service health (integration style)", async () => {
		const response = await SELF.fetch("https://example.com");
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			service: "t2rental-backend",
			status: "ok",
		});
	});
});
