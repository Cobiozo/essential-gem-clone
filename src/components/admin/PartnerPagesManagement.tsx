import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Layout, Package } from 'lucide-react';
import { PartnerPageAccessManager } from './PartnerPageAccessManager';
import { PartnerTemplateEditor } from './PartnerTemplateEditor';
import { ProductCatalogManager } from './ProductCatalogManager';

export const PartnerPagesManagement: React.FC = () => {
  const [subTab, setSubTab] = useState('access');

  return (
    <div className="space-y-6">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="access">
            <Globe className="w-4 h-4 mr-2" />
            Kontrola dostępu
          </TabsTrigger>
          <TabsTrigger value="template">
            <Layout className="w-4 h-4 mr-2" />
            Szablon strony
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            Katalog produktów
          </TabsTrigger>
        </TabsList>

        <TabsContent value="access">
          <PartnerPageAccessManager />
        </TabsContent>

        <TabsContent value="template">
          <PartnerTemplateEditor />
        </TabsContent>

        <TabsContent value="products">
          <ProductCatalogManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnerPagesManagement;
