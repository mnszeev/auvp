Zeev.Controller = {
  Settings: {
    MapFields: () => {
      Zeev.Form.Functions.AddGrouping("Dados do Processo", "DadosDoProcesso", ["Codigo_processo", "Mes_referencia"]);
      Zeev.Form.Functions.AddGrouping("Variáveis", "Variaveis", [
        "totalKmPercorrida",
        "totalDiasADescontar",
        "totalTarifa",
      ]);
    },
    MapDataSources: () => {
      Zeev.Integration.Functions.AddDataSource("VehicleCompensationByReferenceMonth", {
        name: "Indenização de Veículos Por Mês de Referência",
       // name: "Indenização de Veículos Por Mês de Referência - Te",
        Dev: "/api/2.0/integrations/595e7171-4722-4075-9471-7390caef45c2/execute",
        Hml: "/api/internal/legacy/1.0/datasource/get/1.0/qw0Xk6xWKL563BI8VvBqJsL789kHjzp988GeZr-A7ANpUIoXnJrpXW3c6fbH5dU1nJBoSt-YQVBZXhqrCsqEFg__",
        Prd: "/api/2.0/integrations/6b77ba2f-aa98-468b-9301-727a4c516403/execute",
        //Prd: "https://zeev.sefaz.rs.gov.br/api/2.0/integrations/e2653fff-354a-4dda-8b18-7a22d2bb87da/execute",
      });
      Zeev.Integration.Functions.AddDataSource("CitiesOfRS", {
        name: "Cidades do Rio Grande do Sul",
        Dev: "/api/2.0/integrations/b0d1a3d3-6dac-4d81-b81a-770bc7914086/execute",
        Hml: "/api/internal/legacy/1.0/datasource/get/1.0/qw0Xk6xWKL563BI8VvBqJm3KpIkO9CEecRV7w2QK8zeHVeTsxPHSG6T8E9JuFOZQxQYJqh4LLNpthHEON9-d8Q__",
        Prd: "/api/2.0/integrations/0c434beb-b11f-4c0c-8aac-032b2d349c10/execute",
      });
      Zeev.Integration.Functions.AddDataSource("ReleaseCompensationBatchReport", {
        name: "Report Liberação Lote de Indenização",
        Dev: "/api/2.0/integrations/21fa0ef6-23cc-449d-b698-91ba417aacb0/execute",
        Hml: "/api/internal/legacy/1.0/datasource/get/1.0/qw0Xk6xWKL563BI8VvBqJqzCo3gJTKEkcMpVpdD7z9e8VIDTM7@lc-CF4Ek3UGbNViqHl46mioX@gvJVKBB6tg__",
        Prd: "/api/2.0/integrations/5dce0d79-b0b1-4aac-9de9-70552451b7f0/execute",
      });
    },
    Init: () => {
      Zeev.Resources.Functions.MapNativeResources();
      Zeev.Controller.Settings.MapFields();
      Zeev.Controller.Settings.MapDataSources();
    },
  },
  CustomerRules: {
    FetchPostRequest: async (dataSource, params) => {
      let result = null;
      await Zeev.Integration.Functions.ExecuteDataSource(Zeev.Integration.DataSources[dataSource], params, "POST").then(
        (response) => {
          if (response) result = response;
        }
      );
      return result;
    },
    FetchGetRequest: async (dataSource) => {
      let result = null;
      await Zeev.Integration.Functions.ExecuteDataSource(Zeev.Integration.DataSources[dataSource], "GET").then(
        (response) => {
          if (response) result = response;
        }
      );
      return result;
    },
    GetCitiesOfRS: async () => {
      const citiesOfRS = await Zeev.Controller.CustomerRules.FetchGetRequest("CitiesOfRS");
      return [].concat(citiesOfRS || []);
    },

    sleep: async (ms) => {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    MountVehicleCompensationPostBody: (referenceMonth, pageNumber) => {
      const requestBody = {
        startDateIntervalBegin: "2024-01-01T00:00:00",
        startDateIntervalEnd: "2028-01-01T00:00:00",
        simulation: false,
        flowId: 112,
        pageNumber: pageNumber,
        recordsPerPage: 100,
        formFieldNames: [
          "servidor",
          "municipio",
          "valor_tarifa_km",
          "km_maxima_sem_comprovacao",
          "aRT6OR",
          "art8OR",
          "art9OUnicoR",
          "totalKmPercorrida",
          "codigo_credor",
          "totalR",
          "area",
        ],
        formFieldsFilter: [
          {
            name: "mes_referencia",
            operator: "=",
            value: referenceMonth,
          },
        ],
      };

      return JSON.stringify(requestBody);
    },

    GetVehicleCompensationByReferenceMonth: async () => {
      const referenceMonth = document.getElementById("inpmes_referencia").value;
      const allResults = [];

      for (let pageNumber = 1;; pageNumber++) {
        const params = {
          inpbody: Zeev.Controller.CustomerRules.MountVehicleCompensationPostBody(referenceMonth, pageNumber),
        };

        const response = await Zeev.Controller.CustomerRules.FetchPostRequest(
          "VehicleCompensationByReferenceMonth",
          params
        );

        const data = Array.isArray(response) ? response : response?.items || response?.data || [];

        if (!data || data.length === 0) {
          break; // encerra quando não houver mais páginas
        }

        allResults.push(...data);
      }

      return allResults;
    },

    GenerateCsv: async () => {
      const citiesOfRS = await Zeev.Controller.CustomerRules.GetCitiesOfRS();
      const vehicleCompensationByReferenceMonth =
        await Zeev.Controller.CustomerRules.GetVehicleCompensationByReferenceMonth();
      Zeev.Controller.CustomerRules.GenerateCsvFile("STI", vehicleCompensationByReferenceMonth, citiesOfRS);
      Zeev.Controller.CustomerRules.GenerateCsvFile("DEPAD", vehicleCompensationByReferenceMonth, citiesOfRS);
      Zeev.Controller.CustomerRules.GenerateCsvFile("GSF", vehicleCompensationByReferenceMonth, citiesOfRS);
      Zeev.Controller.CustomerRules.GenerateCsvFile("Receita", vehicleCompensationByReferenceMonth, citiesOfRS);
      Zeev.Controller.CustomerRules.GenerateCsvFile("CAGE", vehicleCompensationByReferenceMonth, citiesOfRS);
      Zeev.Controller.CustomerRules.GenerateCsvFile("Tesouro", vehicleCompensationByReferenceMonth, citiesOfRS);
      Zeev.Controller.CustomerRules.GenerateCsvFile("Servidores", vehicleCompensationByReferenceMonth, citiesOfRS);
    },
    GenerateCsvFile: (area, servantList, cityList) => {
      let csvRows = "";
      let committedValue = 0;
      let filteredServantList;

      if (area === "Servidores") {
        filteredServantList = servantList = servantList.filter(
          (item) => item.fields.flowResult === "Enviado para aprovação de lote"
        );
      } else {
        filteredServantList = servantList = servantList.filter(
          (item) =>
            item.fields.area.toUpperCase() === area.toUpperCase() &&
            item.fields.flowResult === "Enviado para aprovação de lote"
        );
      }
      for (const servant of filteredServantList) {
        const name = servant.fields.nome;
        const codCredor = servant.fields.codigo_credor;
        const cityName = servant.fields.municipio;
        const cityCode = cityList.find((c) => c.txt.toLowerCase() === cityName.toLowerCase()).cod;
        const fareValue = servant.fields.valor_tarifa_km;
        const kmMax = servant.fields.km_maxima_sem_comprovacao;
        const art8Value = servant.fields.art8OR;
        const kmTraveled = servant.fields.totalKmPercorrida;
        const art6Value = servant.fields.aRT6OR;
        const art9Value = servant.fields.art9OUnicoR;
        const totalValue = servant.fields.totalR;
        csvRows += `${name};${codCredor};${cityCode};${cityName};${fareValue};${kmMax};${art8Value};${kmTraveled};${art6Value};${art9Value};${totalValue};${kmMax}`;
        csvRows += `\n`;
        const parsedTotal = Number(
          totalValue.replace(/\./g, "").replace(",", ".")
        );
        committedValue += isNaN(parsedTotal) ? 0 : parsedTotal;
      }

      const caseNumber = document.getElementById("inpcodigo_processo").value;
      const competence = document.getElementById("inpmes_referencia").value;
      committedValue = Number(committedValue.toFixed(2));
      let csvHeader = "";
      csvHeader += `Nome da área: ${area}`;
      csvHeader += `\n`;
      csvHeader += `N° do expediente: ${caseNumber}`;
      csvHeader += `\n`;
      csvHeader += `Competência: ${competence}`;
      csvHeader += `\n`;
      csvHeader += `Valor total a ser empenhado: R$ ${committedValue}`;
      csvHeader += `\n`;
      csvHeader += `Legislação:`;
      csvHeader += `\n\n`;
      csvHeader += `Nome Credor;Cod Credor;Cod Municipio;Nome Municipio;Valor Tarifa;Km Fixa;Valor Art8;Km Percorrida;Valor Art6;Valor Art9;Valor Total a Receber;Km Total a Receber`;
      csvHeader += `\n`;

      const csvContent = "\uFEFF" + csvHeader + csvRows;

      const areaObject = {
        STI: "divrelatorioServidoresDETIC",
        DEPAD: "divservidoresDEPAD",
        GSF: "divservidoresGSF",
        Receita: "divservidoresReceita",
        CAGE: "divservidoresCAGE",
        Tesouro: "divservidoresTesouro",
        Servidores: "divtodosOsServidores",
      };

      const csvElement = areaObject[area];
      const csvName = `Processo${Zeev.Resources.Native.CodFlowExecute.GetValue()}_Lote_${area}.csv`;
      const csvLink = Zeev.Controller.CustomerRules.GenerateCsvLink(csvContent, csvName);
      Zeev.Controller.CustomerRules.GenerateCsvElement(csvElement, csvLink, csvName);
    },
    GenerateCsvLink: (csvContent, csvName) => {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");

      downloadLink.href = url;
      downloadLink.download = csvName;
      return downloadLink;
    },
    GenerateCsvElement: (csvElement, csvLink, csvName) => {
      const element = document.querySelector(`[xid='${csvElement}']`);
      const uid = Zeev.Controller.CustomerRules.GeneratCsvId();
      element.setAttribute("data-client-uid", uid);
      const html = `
                <div class="containerFormFileLink">
                    <a href="${csvLink}" target="_blank" class="small">${csvName}</a>
                    <a href="javascript:void(0)" class="ml-3" title="Excluir" onclick="javascript:execv2.form.fileUpload.delete('${uid}')">
                        <svg class="ico-delete ico-sm text-danger" focusable="true"><use xlink:href="#delete"></use></svg>
                    </a>
                </div>`;

      document.querySelector(`[xid='${csvElement}']`).innerHTML = html;
    },
    GeneratCsvId: () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < 9; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    },
    FetchReleaseCompensationBatchReport: async () => {
      const params = { inpflowId: FlowId };
      const report = await Zeev.Controller.CustomerRules.FetchPostRequest("ReleaseCompensationBatchReport", params);

      if (report) {
        const lastInstance = Array.isArray(report) ? report[report.length - 1] : report;
        Zeev.Form.Fields.DadosDoProcesso.Codigo_processo.SetValue(lastInstance.fields.codigo_processo);
        Zeev.Form.Fields.DadosDoProcesso.Mes_referencia.SetValue(lastInstance.fields.mes_referencia);
        Zeev.Form.Fields.DadosDoProcesso.Ano_indenizacao.SetValue(lastInstance.fields.ano_indenizacao);
        Zeev.Form.Fields.DadosDoProcesso.Numero_dias_mes.SetValue(lastInstance.fields.numero_dias_mes);
        Zeev.Form.Fields.DadosDoProcesso.Km_maxima_sem_comprovacao.SetValue(
          lastInstance.fields.km_maxima_sem_comprovacao
        );
        Zeev.Form.Fields.DadosDoProcesso.Km_maxima_indenizavel.SetValue(lastInstance.fields.km_maxima_indenizavel);
        Zeev.Form.Fields.DadosDoProcesso.Valor_tarifa_km.SetValue(lastInstance.fields.valor_tarifa_km);
      }
      const currentDate = Zeev.Controller.CustomerRules.GetFormatedCurrentDate();
      Zeev.Form.Fields.DadosDoProcesso.Data_limite_ccuvp.SetValue(
        Zeev.Controller.CustomerRules.CalculateSla(currentDate, 10)
      );
    },
    GetFormatedCurrentDate() {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      return `${day}/${month}/${year}`;
    },
    CalculateSla: (startDate, sla) => {
      const [day, month, year] = startDate.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      date.setDate(date.getDate() + sla);
      const newDay = String(date.getDate()).padStart(2, "0");
      const newMonth = String(date.getMonth() + 1).padStart(2, "0");
      const newYear = date.getFullYear();
      return `${newDay}/${newMonth}/${newYear}`;
    },
  },
};

document.addEventListener("DOMContentLoaded", function (e) {
  setTimeout(() => {
    Zeev.Controller.Settings.Init();
  }, Zeev.System.TimeOut);
});
