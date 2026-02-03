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
        Dev: "/api/internal/legacy/1.0/datasource/get/1.0/qw0Xk6xWKL563BI8VvBqJsL789kHjzp988GeZr-A7ANpUIoXnJrpXW3c6fbH5dU1nJBoSt-YQVBZXhqrCsqEFg__",
        Prd: "/api/2.0/integrations/6b77ba2f-aa98-468b-9301-727a4c516403/execute",
      });
      Zeev.Integration.Functions.AddDataSource("CitiesOfRS", {
        name: "Cidades do Rio Grande do Sul",
        Dev: "/api/internal/legacy/1.0/datasource/get/1.0/qw0Xk6xWKL563BI8VvBqJm3KpIkO9CEecRV7w2QK8zeHVeTsxPHSG6T8E9JuFOZQxQYJqh4LLNpthHEON9-d8Q__",
        Prd: "/api/2.0/integrations/0c434beb-b11f-4c0c-8aac-032b2d349c10/execute",
      });
      Zeev.Integration.Functions.AddDataSource("ReleaseCompensationBatchReport", {
        name: "Report Liberação Lote de Indenização",
        Dev: "/api/internal/legacy/1.0/datasource/get/1.0/qw0Xk6xWKL563BI8VvBqJqzCo3gJTKEkcMpVpdD7z9e8VIDTM7@lc-CF4Ek3UGbNViqHl46mioX@gvJVKBB6tg__",
        Dev: "/api/2.0/integrations/5dce0d79-b0b1-4aac-9de9-70552451b7f0/execute",
      });
    },
    Init: async () => {
      Zeev.Resources.CustomVariables.Environments = "Prd";
      Zeev.System.IsDebug = true;

      Zeev.Resources.Functions.MapNativeResources();
      Zeev.Controller.Settings.MapFields();
      Zeev.Controller.Settings.MapDataSources();
      await Zeev.Controller.CustomerRules.GenerateCsv();
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

    MountVehicleCompensationPostBody: (referenceMonth, pageNumber) => {
      let requestBody = {
        startDateIntervalBegin: "2024-01-01T00:00:00",
        startDateIntervalEnd: "2028-01-01T00:00:00",
        simulation: false,
        flowId: 112,
        pageNumber: pageNumber,
        recordsPerPage: 100,
        formFieldNames: [
          "servidor",
          "municipio",
          "idMunicipio",
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
      const referenceMonth = document.querySelector("[xid='divmes_referencia']").innerHTML;
      const allResults = [];
      for (let pageNumber = 1; ; pageNumber++) {
        const params = {
          inpbody: Zeev.Controller.CustomerRules.MountVehicleCompensationPostBody(referenceMonth, pageNumber),
        };
        let response = await Zeev.Controller.CustomerRules.FetchPostRequest(
          "VehicleCompensationByReferenceMonth",
          params
        );

        let data = [];

        if (Array.isArray(response)) {
          data = response;
        } else if (Array.isArray(response?.items)) {
          data = response.items;
        } else if (Array.isArray(response?.data)) {
          data = response.data;
        }

        if (!data || data.length === 0) {
          break;
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

    FilterByArea: (servantList, area) => {
      if (area === "Servidores") {
        return (servantList = servantList.filter(
          (item) => item.fields.flowResult === "Enviado para aprovação de lote"
        ));
      } else {
        const areaUpper = area.toUpperCase();

        return (servantList = servantList.filter(
          (item) =>
            (areaUpper === "DEPAD" || areaUpper === "SUPAD"
              ? ["DEPAD", "SUPAD"].includes(item.fields.area.toUpperCase())
              : item.fields.area.toUpperCase() === areaUpper) &&
            item.fields.flowResult === "Enviado para aprovação de lote"
        ));
      }
    },
    GenerateCsvFile: (area, servantList, cityList) => {
      let csvRows = "";
      let committedValue = 0;
      let cityCode;

      const filteredServantList = Zeev.Controller.CustomerRules.FilterByArea(servantList, area);

      for (const servant of filteredServantList) {
        const name = servant.fields.nome;
        const codCredor = servant.fields.codigo_credor;
        const cityName = servant.fields.municipio;
                if (servant.fields.idMunicipio) {
              cityCode = servant.fields.idMunicipio;
          } else {
              const city = cityList.find((c) => c.txt.toLowerCase() === cityName.toLowerCase());
              cityCode = city ? city.cod : null; // Atribui o código ou null se não encontrar
          }
        const fareValue = servant.fields.valor_tarifa_km;
        const kmMax = servant.fields.km_maxima_sem_comprovacao;
        const art8Value = servant.fields.art8OR;
        const kmTraveled = servant.fields.totalKmPercorrida;
        const art6Value = servant.fields.aRT6OR;
        const areaServante = servant.fields.area;
        const art9Value = servant.fields.art9OUnicoR;
        const totalValue = servant.fields.totalR;
        const parsedTotalValue = Number(totalValue.replace(/\./g, "").replace(",", "."));
        const parsedFareValue = Number(fareValue.replace(/\./g, "").replace(",", "."));
        const totalKmNumber = parsedFareValue > 0 ? parsedTotalValue / parsedFareValue : 0;
        const totalKm = totalKmNumber.toLocaleString("pt-BR", {
          minimumFractionDigits: 7,
          maximumFractionDigits: 7,
        });
        csvRows += `${name};${areaServante};${codCredor};${cityCode};${cityName};${fareValue};${kmMax};${kmTraveled};${art8Value};${art6Value};${art9Value};${totalValue};${totalKm}`;
        csvRows += `\n`;
        const parsedTotal = Number(totalValue.replace(/\./g, "").replace(",", "."));
        committedValue += isNaN(parsedTotal) ? 0 : parsedTotal;
      }

      const caseNumber = document.querySelector("[xid='divcodigo_processo']").innerHTML;
      const competence = document.querySelector("[xid='divmes_referencia']").innerHTML;
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
      csvHeader += `Nome Credor;Área;Cod Credor;Cod Municipio;Nome Municipio;Valor Tarifa;Km Fixa;Km Percorrida;Valor Art8;Valor Art6;Valor Art9;Valor Total a Receber;Km Total a Receber`;
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
      const html = `
                <div class="containerFormFileLink">
                    <a href="${csvLink}" target="_blank" class="small">${csvName}</a>
                </div>`;

      element.innerHTML = html;
    },
  },
};

document.addEventListener("DOMContentLoaded", function (e) {
  setTimeout(() => {
    Zeev.Controller.Settings.Init();
  }, Zeev.System.TimeOut);
});
