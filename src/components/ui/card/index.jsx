import React from 'react';  // 添加这行导入

const Card = ({ className = "", ...props }) => (
  <div className={`rounded-lg border bg-white shadow-sm ${className}`} {...props} />
);

const CardHeader = ({ className = "", ...props }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
);

const CardTitle = ({ className = "", ...props }) => (
  <h3 className={`text-2xl font-semibold ${className}`} {...props} />
);

const CardContent = ({ className = "", ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
);

export { Card, CardHeader, CardTitle, CardContent };