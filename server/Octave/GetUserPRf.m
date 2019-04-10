function [ ] = GetUserPRf( name )
% Calculate a production rate from user's values

% Open paths and load data
addpath Functions
addpath Constants
addpath jsonlab
load GMDB
load OtherCst

% Retreive json file
Data=loadjson(name);

% Load the parameters
Nucl=Data.Nucl;
Scheme=Data.Scheme;
Atm=Data.Atm;
if Atm==0;
    load ERA40
else
    meanP=[];
    meanT=[];
    ERA40lat=[];
    ERA40lon=[];
end
if length(Data.GMDB)==1;
    NumGMDB=Data.GMDB;
    if NumGMDB==1;
        SelGMDB=GMDB.Musch;
    elseif NumGMDB==2;
        SelGMDB=GMDB.GLOPIS;
    else
        SelGMDB=GMDB.LSD;
    end
else
    NumGMDB=4;
    SelGMDB=Data.GMDB;
end
mu=OtherCst.Dens/OtherCst.Attlgth;
tBe=OtherCst.tBe;
Lambda10Be=log(2)/tBe;

% Load the Calibration Values
LocalAgeV=Data.Age(1);
LocalAgeE=Data.Age(2);
LocalConcV=Data.NuclCon;
LocalConcE=Data.NuclErr;
LocalLatV=Data.Lat;
LocalLonV=Data.Lon;
LocalAltV=Data.Alt;
LocalErV=Data.Eros;

% % waitbar
% h = waitbar(0,'Calculating');
% steps=3;
% waitbar(1/steps)

% Calculate Scaling Factor
if Scheme==1;
    SF=StoneFactCT(LocalAgeV/1000,LocalLatV,LocalLonV,LocalAltV,SelGMDB,Atm,ERA40lat,ERA40lon,meanP,meanT); % Except for this function in kyr
else
    if NumGMDB==3;
        [VecT,VecSF]=LSDv9(LocalLatV,LocalLonV,LocalAltV,Atm,LocalAgeV,-1,Nucl,NumGMDB);
    else
        [VecT,VecSF]=LSDv9(LocalLatV,LocalLonV,LocalAltV,Atm,LocalAgeV,-1,Nucl,SelGMDB);
    end
    SF= LSDtimeInteg(Nucl,VecT,VecSF);
end

% waitbar(2/steps)

% Calculate SLHL Production rate
if isnan(SF)==1;
    SLHLPR=NaN;
    SLHLPRErr=NaN;
else
    RErr=sqrt((LocalConcE/LocalConcV)^2+(LocalAgeE/LocalAgeV)^2);
    if Nucl==3;
        if LocalErV==0;
            LocalPR=LocalConcV/(LocalAgeV);
        else
            LocalPR=(LocalConcV*mu*LocalErV)/(1-exp(-mu*LocalErV*LocalAgeV));
        end
    elseif Nucl==10;
        LocalPR=((Lambda10Be+mu*LocalErV)*LocalConcV)/((1-exp(-(Lambda10Be+mu*LocalErV)*LocalAgeV)));
    end
    LocalErr=LocalPR*RErr;
    SLHLPR=LocalPR/SF;
    SLHLPRErr=SLHLPR*RErr;
end

% Prepare output
DataOut.LocalPR=[LocalPR LocalErr];
DataOut.SLHLPR=[SLHLPR SLHLPRErr];
DataOut.ScalFact=SF;

% Write json
DataOut=savejson(name,DataOut);
NameOut=strcat(name(1:end-2),'out');
fileID=fopen(NameOut,'w');
fprintf(fileID,'%s',DataOut);
fclose(fileID);

% Closing
% waitbar(3/steps)
% close(h)

end

