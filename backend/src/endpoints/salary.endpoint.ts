import { Router } from 'express';
import { salarySchema } from '../schemas/finance.schemas.js';
import { clearSalary, deleteSalaryPeriod, getSalary, saveSalary } from '../store.js';

export const salaryRouter = Router();

salaryRouter.get('/', async (_request, response, next) => {
  try {
    response.json(await getSalary());
  } catch (error) {
    next(error);
  }
});

salaryRouter.put('/', async (request, response, next) => {
  try {
    response.json(await saveSalary(salarySchema.parse(request.body)));
  } catch (error) {
    next(error);
  }
});

salaryRouter.delete('/', async (_request, response, next) => {
  try {
    await clearSalary();
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

salaryRouter.delete('/:id', async (request, response, next) => {
  try {
    if (!await deleteSalaryPeriod(request.params['id'])) {
      response.status(404).json({ message: 'Salary period not found' });
      return;
    }
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
