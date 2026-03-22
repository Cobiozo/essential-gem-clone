import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Layout, Package, ClipboardList, FolderOpen, FileInput } from 'lucide-react';
import { PartnerPageAccessManager } from './PartnerPageAccessManager';
import { PartnerTemplateEditor } from './PartnerTemplateEditor';
import { ProductCatalogManager } from './ProductCatalogManager';
import { SurveyManager } from './SurveyManager';
import { BpPageFilesManager } from './BpPageFilesManager';
import { PartnerFormsManager } from './PartnerFormsManager';

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
          <TabsTrigger value="survey">
            <ClipboardList className="w-4 h-4 mr-2" />
            Ankieta
          </TabsTrigger>
          <TabsTrigger value="bp-files">
            <FolderOpen className="w-4 h-4 mr-2" />
            Pliki na stronę BP
          </TabsTrigger>
          <TabsTrigger value="forms">
            <FileInput className="w-4 h-4 mr-2" />
            Formularze
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

        <TabsContent value="survey">
          <SurveyManager />
        </TabsContent>

        <TabsContent value="bp-files">
          <BpPageFilesManager />
        </TabsContent>

        <TabsContent value="forms">
          <PartnerFormsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnerPagesManagement;
