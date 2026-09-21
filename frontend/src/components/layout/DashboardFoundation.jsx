import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

const MetricCard = ({ title, value, icon, description, trend, trendLabel, className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center">
            {trend && (
              <span className={`mr-1 font-medium ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-muted-foreground'}`}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendLabel}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const ChartCardContainer = ({ title, children, className = '' }) => {
  return (
    <Card className={`col-span-1 md:col-span-2 lg:col-span-3 ${className}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

export { MetricCard, ChartCardContainer };
