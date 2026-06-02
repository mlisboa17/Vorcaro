export interface BudgetCategorySnapshot {
  categoryId: string;
  categoryName: string;
  planejado: number;
  realizadoDre: number;
}

export interface BudgetOverview {
  totalPlanejado: number;
  totalRealizadoDre: number;
  restante: number;
  categoriasEstouradas: number;
  categoriasAtencao: number;
  categories: BudgetCategorySnapshot[];
}

export interface BudgetOverviewPort {
  getOverview(userId: string, reference?: Date): Promise<BudgetOverview>;
}
