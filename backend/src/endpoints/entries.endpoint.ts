import { Router } from "express";
import { entrySchema } from "../schemas/finance.schemas.js";
import { enrichEntries, enrichEntry } from "../services/entry.service.js";
import { createEntry, deleteEntry, getEntries, updateEntry } from "../store.js";

export const entriesRouter = Router();

entriesRouter.get("/", async (request, response, next) => {
  try {
    const month = String(request.query["month"] ?? "");
    const type = String(request.query["type"] ?? "");
    let entries = await getEntries();
    if (month) {
      entries = entries.filter((entry) => {
        return entry.date.startsWith(month);
      });
    }
    if (type === "income" || type === "expense") {
      entries = entries.filter((entry) => {
        return entry.type === type;
      });
    }
    response.json(await enrichEntries(entries));
  } catch (error) {
    next(error);
  }
});

entriesRouter.post("/", async (request, response, next) => {
  try {
    const entry = await createEntry(entrySchema.parse(request.body));
    response.status(201).json(await enrichEntry(entry));
  } catch (error) {
    next(error);
  }
});

entriesRouter.put("/:id", async (request, response, next) => {
  try {
    const entry = await updateEntry(
      request.params["id"],
      entrySchema.parse(request.body),
    );
    if (!entry) {
      response.status(404).json({ message: "Entry not found" });
      return;
    }
    response.json(await enrichEntry(entry));
  } catch (error) {
    next(error);
  }
});

entriesRouter.delete("/:id", async (request, response, next) => {
  try {
    if (!(await deleteEntry(request.params["id"]))) {
      response.status(404).json({ message: "Entry not found" });
      return;
    }
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
